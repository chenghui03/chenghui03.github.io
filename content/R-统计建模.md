---
{"publish":true,"created":"2026-01-08T15:12:58.100+08:00","modified":"2026-01-11T15:21:48.121+08:00","cssclasses":""}
---



## 统计建模是什么?

在生物信息学中，我们面对的是一个高维的观测空间。假设你测量了某个基因在不同样本中的表达量，这构成了一个观测向量 $Y$。统计建模，并不是寻找一个完美的等式，而是寻找一种解释。

### 为什么需要建模

生物实验中的观测值永远包含两部分：信号与噪声。信号是我们感兴趣的生物学因素（如药物处理、基因敲除），而噪声则是随机波动或技术偏差。建模的过程，就是尝试用一组已知的解释变量（Explanatory Variables）去构建一个线性子空间，并将观测向量 $Y$ 投影到这个子空间中。

### 变量的解构

变量可以分为：
1. 响应变量（Response Variable）：即我们观测到的基因表达数据。
2. 解释变量（Explanatory Variable）：实验设计中主动引入的变量，如处理组与对照组。
3. 协变量（Covariate）：那些我们不感兴趣但必须考虑的因素，如样本的批次、年龄或性别。

统计建模的目标，是计算出每个解释变量对响应变量的贡献程度，即回归系数 $\beta$。

---

## R 公式的逻辑机理

在 R 语言中，`~` 符号是构建统计模型的引擎。它并非数学意义上的等号，而是一个矩阵生成指令。

### 计算机如何理解公式

当你写下 `~ dex` 时，计算机并不知道什么是“药物处理”。它执行的是一种编码算法：

1. 识别变量类型：发现 `dex` 是一个因子（Factor）。
2. 建立映射：将因子的每个水平（Level）映射为空间中的基向量。
3. 构建设计矩阵（Design Matrix）：生成一个由 0 和 1 组成的矩阵 $X$。

> [!INFO]
> 
> 设计矩阵 $X$ 的每一列代表一个实验状态。对于一个二分类变量，计算机通常会设定一个参考级（Reference Level），其他级别则表示为相对于参考级的偏移。

### 和线性代数的关系

统计模型可以简化为矩阵运算：$Y = X\beta + \epsilon$。其中 $X$ 是设计矩阵，$\beta$ 是待估系数向量。计算机通过最小二乘法寻找使残差平方和 $\sum \epsilon^2$ 最小的 $\beta$。这意味着我们在由 $X$ 的列向量构成的子空间里，找到了离 $Y$ 最近的一点。

---

## limma 实战

`limma`（Linear Models for Microarray Data）虽然最初为芯片设计，但其核心的线性模型架构对 RNA-seq 同样适用。它解决的核心问题是如何在样本量极小的情况下，通过经验贝叶斯（Empirical Bayes）方法对每个基因的方差进行稳健估计。

### 构建设计矩阵

在 `limma` 中，设计矩阵定义了实验的结构。有两种常见的构建方式：
1. 带截距的模型：第一列全为 1，代表基准组。
2. 不带截距的模型：每一列代表一个组的均值。

通常推荐使用不带截距的模型，因为它使对比矩阵的构建更加直观。

```R
# 假设 dex 有两个水平: control, treated
design <- model.matrix(~ 0 + dex)
colnames(design) <- c("Control", "Treated")
```

### 对比矩阵的逻辑

对比矩阵（Contrast Matrix）是生物学假设的代数表现形式。它告诉 `limma` 你到底想比较哪两组。

> [!TIP]
> 
> 如果你的科学问题是“药物处理后基因表达是否有变化”，那么对应的代数操作就是 Treated - Control。

---

## airway 数据集实战演练

我们将使用经典的 airway 数据集, 该数据记录了人类气道平滑肌细胞在用地塞米松（dexamethasone）处理前后的转录组变化。

### 准备工作

首先载入数据并进行基础预处理。

```R
library(airway)
library(limma)
library(edgeR)

data(airway)
# 提取表达矩阵
counts <- assay(airway)
# 提取样本信息
targets <- as.data.frame(colData(airway))
```

### 单因素分析：药物的直接效应

在单因素分析中，我们只关心 `dex` 的影响。

```R
# 1. 创建设计矩阵
group <- targets$dex
design <- model.matrix(~ 0 + group)
colnames(design) <- c("Control", "Treated")

# 2. 转换数据（voom 转换用于处理 RNA-seq 的均值-方差关系）
v <- voom(counts, design, plot=FALSE)

# 3. 拟合模型
fit <- lmFit(v, design)

# 4. 设置对比
cont.matrix <- makeContrasts(TreatedvsControl = Treated - Control, levels=design)
fit2 <- contrasts.fit(fit, cont.matrix)

# 5. 经验贝叶斯收缩
fit2 <- eBayes(fit2)
```

在这个模型中，`TreatedvsControl` 这一行告诉计算机：计算 `Treated` 列的均值与 `Control` 列均值的差异，并检验该差异是否显著。

### 多因素交互分析：细胞类型与药物的耦合

在实际研究中，药物的效果往往受到细胞背景的影响。airway 数据集中包含 4 种不同的细胞系（cell）。

> [!NOTE]
> 
> 交互作用（Interaction）旨在回答：药物在细胞系 A 中的效应，是否显著不同于在细胞系 B 中的效应？

```R
# 组合因素
cell_type <- targets$cell
group_combined <- factor(paste(cell_type, group, sep="."))
design_int <- model.matrix(~ 0 + group_combined)
colnames(design_int) <- levels(group_combined)

# 拟合
v_int <- voom(counts, design_int, plot=FALSE)
fit_int <- lmFit(v_int, design_int)

# 交互作用对比
# 目标：比较 N61311 细胞系和 N052611 细胞系对药物反应的差异
cont_int <- makeContrasts(
  Interaction = (N61311.trt - N61311.untrt) - (N052611.trt - N052611.untrt),
  levels=design_int
)
fit_int2 <- contrasts.fit(fit_int, cont_int)
fit_int2 <- eBayes(fit_int2)
```

这里 `(N61311.trt - N61311.untrt)` 代表了药物在 N61311 细胞系中的效应量。通过将两个效应量相减，我们实际上是在检验药物反应的专一性。

---

## 诊断与常见问题

### 满秩与多重共线性

在构建设计矩阵时，最常见的错误是 `Design matrix is not full rank`。这通常发生在解释变量之间存在完美的线性相关时。例如，如果你同时将“性别”和“是否为男性”作为两个独立的变量放入模型，计算机会发现其中一列可以由另一列完全推导出来，导致矩阵无法求逆。

解决办法通常是删除冗余变量，或者通过组合变量的方式（如上述多因素分析）来重新定义设计矩阵。

---
## 参考

