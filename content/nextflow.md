---
{"publish":true,"created":"2025-12-02T20:04:41.000+08:00","modified":"2025-12-02T20:04:41.000+08:00","cssclasses":""}
---

## 动机

每个任务本质上是container + command + resources + input + output。
nf目标是将pipeline的并行化和可复现，它的方法是将平台执行和pipeline逻辑分离。

### dataflow programming

dataflow programming **描述“数据如何在步骤之间流动”。** 每当数据出现在一个通道上，一个 process 会自动被触发执行。

## 核心概念

Channel：传递输入/输出的数据流，多个输出值会被process并发执行，并且channel本身只有输入/输出，但是其输出可以被多个不同process所接收并且创建任务。

Process：等待从channel的输入，每个channel值都会触发一次任务执行，并在执行完之后将输出到output channel。Process并不是一个提供返回值的函数，它的输入来自于input channel，直接输出到ouput channel。Process可以是多对多的输入输出channel。Process在pipeline中的step被定义。

Executor：在任何计算环境运行 process。包括local，AWS等

### 其他特性

缓存：当input和process不变时，nf自动重用结果
隐式[[并行]]：同一个process会被启动多次，不同数据流彼此独立，这些任务都会被隐式并行，用户不需要考虑实现。
可重现：通过指定容器保证整个流程可以被完整重复。

#### DSL2
DSL1 的流程结构是线性的，难以复用；  
而 DSL2 引入了清晰的分层体系，使 pipeline 可以像代码一样组织与组合。
DSL2 中，一个完整的 workflow 可以按照抽象层次分为三个层级：
1. **module**
    - 封装单一 process
    - 可作为独立功能单元复用
2. **subworkflow**
    - 对多个 module 进行组合，实现一个中间步骤序列
    - 常用于构建可复用的大步骤，如 alignment + sorting + indexing
3. **workflow（主流程）**
    - 在最高层组合多个 module & subworkflow
    - 定义整个 pipeline 的输入、输出与整体结构
这种分层方式让 DSL2 的 pipeline 可以 **组合、复用、替换、扩展**，  
从而构建大规模的生物信息分析流程。

#### DAG

在 Nextflow 中，process 之间的数据依赖关系由 channel 表达。  
数据只能从上游输入流向下游输出，因此 workflow 的结构天然形成一个 **有向无环图（DAG）**：
- Node = process/module/subworkflow
- Edge = channel（数据依赖）
Nextflow 会在执行前根据 DSL2 的声明式语法解析 workflow，构建出 DAG。  
随后，runtime 会依据这个 DAG 决定任务调度策略，使得所有 process 只在其所有输入数据可用时触发。


> [!NOTE] nextflow的任务调度执行前需要进行拓扑排序吗?
> Nextflow 的调度不需要显式拓扑排序，因为数据流模型隐式地实现了拓扑约束。
> DAG 的依赖顺序被 channel 自然表达，没有数据到达前，process 处于“等待状态”，不会执行。当所有上游 channel 数据准备好时，任务自然触发。因此“拓扑排序”的效果是由数据流驱动机制自动实现的



## 最小实现

```python
# nextflow_minimal.py
import concurrent.futures
from queue import Queue
import threading
from concurrent.futures import ThreadPoolExecutor

class Channel:
    """A simple unbounded dataflow channel."""
    def __init__(self):
        self.q = Queue()

    def send(self, item):
        self.q.put(item)

    def receive(self):
        return self.q.get()

class Process:
    """A process triggered by channel input."""
    def __init__(self, name, input_channels, func, parallel=True):
        self.name = name
        self.input_channels = input_channels
        self.func = func
        self.parallel = parallel
        self.pool = ThreadPoolExecutor(max_workers=8)

    def run(self):
        def worker(ch):
            while True:
                item = ch.receive()
                # 下面写法会导致阻塞
                # self.func(item)
                self.pool.submit(self.func, item) # 非阻塞

        if self.parallel:
            for ch in self.input_channels:
                threading.Thread(target=worker, args=(ch,), daemon=True).start()
        else:
            for ch in self.input_channels:
                while True:
                    item = ch.receive()
                    self.func(item)


# 1. create channels
input = Channel()
c1 = Channel()
c2 = Channel()

# 2. define processes
def square(x):
    c1.send(x * x)

def minus1(x):
    c2.send(x-1)

def printer(x):
    print("Result:", x)

p1 = Process("square", [input], func=square)
p1_2 = Process("minus1", [c1], func=minus1)
p2 = Process("print", [c2], func=printer)

# 3. running processes in background threads
import threading
threading.Thread(target=p1.run, daemon=True).start()
threading.Thread(target=p1_2.run, daemon=True).start()
threading.Thread(target=p2.run, daemon=True).start()

# 4. send data
for i in range(5):
    input.send(i)
```

## 使用

### DSL2语法

| 关键字                | 用途                      |
| ------------------ | ----------------------- |
| `tag`              | 设置任务标签                  |
| `val`              | 传递普通数据（数字、字符串、tuple）    |
| `path`             | 传递文件（自动 staging）        |
| `script`           | Shell 执行块               |
| `include`          | 引入 module 或 subworkflow |
| `take`             | 声明 subworkflow 输入       |
| `main`             | subworkflow 主逻辑         |
| `emit`             | 声明 subworkflow 输出       |
| `Channel.fromPath` | 由文件路径构建 channel         |
| `map`              | channel 变换              |
| `view`             | 调试输出                    |

变量名

|            |     |
| ---------- | --- |
| $task.cpus |     |

### 项目结构示例

```bash
my_pipeline/
├── main.nf
├── nextflow.config
├── subworkflows/
└── modules/
    ├── fastqc.nf
    └── align.nf
```

### module: process的包装

`modules/fastqc.nf`

```nextflow
process FASTQC {
    tag "$sample_id"

    input:
    tuple val(sample_id), path(reads)

    output:
    path "fastqc_${sample_id}.zip"

    script:
    """
    fastqc ${reads} -o . -f fastq
    """
}
```

### subprocess: module进一步包装

`subworkflows/qc.nf`

```
include { FASTQC } from '../modules/fastqc.nf'

workflow QC {
    take:
    samples

    main:
    results = samples | FASTQC

    emit:
    results
}
```

### 主逻辑入口: main.nf

`main.nf`

```
nextflow.enable.dsl=2

include { FASTQC } from './modules/fastqc.nf'

workflow {
    samples = Channel.fromPath("data/*.fastq").map{ file -> 
        tuple(file.baseName, file)
    }

    results = FASTQC(samples)

    results.view()
}
```

### config

`nextflow.config`

```
process {
  executor = 'local'
  cpus = 2
  memory = '4 GB'
}
```

### 执行调用

```bash
nextflow run . \
  -profile conda \
  --input ../data/raw/samplesheet.csv \
  --outdir ../results \
  --genome GRCh38 \
  --aligner star_salmon \
  --max_cpus 4 \
  --max_memory '8 GB' \
  -c ../nextflow.config \
  -resume
```

## 其他

组织项目结构

```bash
my-pipeline/
├── main.nf               # 顶层执行图
├── nextflow.config       # 全局参数
│
├── conf/                 # HPC 配置、profile
│   ├── slurm.config
│   └── test.config
│
├── modules/              # 最小任务单元
│   ├── nf-core/
│   └── local/
│       └── custom_step.nf
│
├── subworkflows/         # 模块组合
│   ├── qc.nf
│   ├── align.nf
│   └── quantify.nf
│
├── bin/                  # 自定义脚本
│   └── helper.py
│
├── assets/
│   └── multiqc_config.yaml
│
└── tests/                # CI
```

参考 https://github.com/nf-core/rnaseq

nextflow config settings
https://www.nextflow.io/docs/latest/reference/config.html#config-options
```
-clean-up: 
resume: run using cached task execution
conda: ...
```

constants: `launchDir`: 运行脚本位置, `projectDir`: where main script place(允许使用url)  
scope：作用域，用于分隔不同的变量用于避免冲突

process用于只掉不同process使用多少资源，支持使用正则表达式匹配tag
```
process {
    withLabel: 'hello' { cpus = 2 }
    withLabel: '!hello' { cpus = 4 }
    withName: '!align.*' { queue = 'long' }
}
```

profile用于指定不同执行环境下的process设置

event handle：在流程结束后或者报错候如何进行处理