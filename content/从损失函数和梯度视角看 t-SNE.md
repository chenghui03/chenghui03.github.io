---
{"publish":true,"created":"2025-12-22T11:33:26.506+08:00","modified":"2025-12-22T12:04:45.162+08:00","cssclasses":""}
---


在单细胞测序（scRNA-seq）分析中，t-SNE 几乎是标准配图。我们习惯于指着图上的两个簇说：“Cluster A 和 Cluster B 离得很远，说明它们表达模式差异很大。”

这是一个危险的幻觉。

t-SNE 最根本的数学特性决定了它只能保证“相似的东西聚在一起”，而绝不保证“不相似的东西离得远”。这一特性的根源，在于高维空间的 _Curse of Dimensionality_ 以及 KL 散度（Kullback-Leibler Divergence）天生的不对称性。

## 1. 损失函数的不对称性：KL 散度的惩罚机制

t-SNE 的目标是最小化高维概率分布 $P$ 和低维概率分布 $Q$ 之间的 KL 散度。

$$C = KL(P||Q) = \sum_{i} \sum_{j} p_{ij} \log \frac{p_{ij}}{q_{ij}}$$

这里的核心矛盾在于，KL 散度不是一个度量（Metric），因为它不对称：$KL(P||Q) \neq KL(Q||P)$。这种不对称性在 t-SNE 中导致了极端的“距离扭曲”。

我们可以将损失项拆解为两部分来理解惩罚的权重：

- Case 1: $p_{ij}$ 很大（高维是邻居），但 $q_{ij}$ 很小（低维离得远）。
    - 此时 $\log(p/q)$ 变得巨大。
    - 结果：产生巨大的 Loss（Cost）。算法会拼命把这两个点拉近。这保证了局部结构（Local Structure）的保留。
- Case 2: $p_{ij}$ 很小（高维离得远），但 $q_{ij}$ 很大（低维靠得近）。
    - 此时 $p_{ij}$ 作为权重系数接近于 0。
    - 结果：Loss 非常小，甚至忽略不计。这意味着，算法并不在乎原本相距甚远的两个点在低维空间中是否重叠。
        

### 代码可视化：KL 散度的不对称惩罚

为了直观理解这一点，我们可以绘制 $Cost$ 随低维距离（体现为 $q_{ij}$）变化的曲线。

![[attachments/Pasted image 20251222120327.png]]

> [!INFO] 图解分析
> 
> - 红色曲线 (High P)：当 $q_{ij}$ 很小（低维离得远）时，Cost 激增。这就是强大的吸引力。
>     
> - 蓝色曲线 (Low P)：整条曲线几乎贴着 0。无论 $q_{ij}$ 是大是小（无论低维是聚还是散），Cost 都极低。这就是全局结构丢失的数学证明——算法对于远处的点怎么排布几乎没有惩罚。


```Python
import numpy as np
import matplotlib.pyplot as plt

def kl_contribution(p, q):
    """计算单个pair对KL散度的贡献"""
    # 避免log(0)
    q = np.maximum(q, 1e-10)
    p = np.maximum(p, 1e-10)
    return p  np.log(p / q)

# 模拟低维空间中的距离变化，导致 q 从 0 到 1 变化
# q_ij = (1 + dist^2)^-1, 这里直接模拟 q 的值
q_values = np.linspace(0.0001, 1.0, 500)

# Case A: 高维是邻居 (High P)
p_high = 0.8
cost_high_p = kl_contribution(p_high, q_values)

# Case B: 高维是远端点 (Low P)
p_low = 0.001
cost_low_p = kl_contribution(p_low, q_values)

plt.figure(figsize=(10, 6))
plt.plot(q_values, cost_high_p, label=f'High P (Neighbor, p={p_high})', color='#E24A33', linewidth=2.5)
plt.plot(q_values, cost_low_p, label=f'Low P (Distant, p={p_low})', color='#348ABD', linewidth=2.5)

plt.title("Asymmetry of KL Divergence Loss", fontsize=14)
plt.xlabel("Low-dimensional Probability $q_{ij}$ (Proximity)", fontsize=12)
plt.ylabel("Cost Contribution", fontsize=12)
plt.axvline(x=0.1, color='gray', linestyle='--', alpha=0.5, label='Low Similarity (Far in 2D)')
plt.axvline(x=0.9, color='gray', linestyle='--', alpha=0.5, label='High Similarity (Close in 2D)')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()
```


---

## 梯度的物理视角：引力与斥力的失衡

从优化的角度看，t-SNE 的梯度下降过程本质上是一个多体模拟（N-body simulation）。如果我们对位置 $y_i$ 求导，会发现梯度包含两项力：

$$\frac{\partial C}{\partial y_i} = 4 \sum_{j} (p_{ij} - q_{ij})(y_i - y_j)(1 + ||y_i - y_j||^2)^{-1}$$

这项公式描述了弹簧系统：

1. 吸引力（Attraction）：源自 $p_{ij}$。高维邻居之间存在强力的弹簧，试图把点拉到一起。
2. 斥力（Repulsion）：源自 $q_{ij}$（归一化因子 $Z$ 的导数产生）。所有点之间都存在微弱的斥力，防止所有点塌缩成一个点。
    

为什么簇间距离不可信？

因为斥力的衰减速度由 t 分布（长尾）决定。在 t-SNE 中，斥力虽然存在，但只要点与点之间拉开了一定距离，斥力就变得极微弱。这导致簇（Cluster）可以在低维空间中任意漂移，只要它们不撞在一起即可。它们的绝对位置和相对距离主要是随机初始化和早期优化的产物，而非数据的真实反映。

---

## Perplexity：香农熵定义的“软”邻居

很多教程将 Perplexity 解释为“邻居个数 k”，这不够准确。Perplexity 是一个基于香农熵（Shannon Entropy）的连续度量。

对于每个点 $i$，我们寻找一个高斯分布的方差 $\sigma_i$，使得该点作为中心的概率分布 $P_i$ 的熵满足：

$$Perplexity = 2^{H(P_i)}$$

$$H(P_i) = - \sum_j p_{j|i} \log_2 p_{j|i}$$

- 定性理解：Perplexity 定义了我们观察数据的“平滑半径”。
- 定量关系：
    - 低 Perplexity (e.g., 5-10)：熵很低，概率分布 $P_i$ 极其尖锐。我们只关注极少数的一两个最近邻。结果：数据被撕裂成许多微小的碎片簇。
    - 高 Perplexity (e.g., 50-100)：熵很高，概率分布平坦。每个点“看到”的有效邻居很多。结果：全局结构保留得更好，但局部细节可能会模糊。
        

> [!TIP] 调参直觉
> 
> 在生物学数据中，如果你关注细微的亚群（Sub-clustering），调低 Perplexity；如果你关注连续的发育轨迹（Trajectories）或全局拓扑，必须调高 Perplexity，甚至接近样本数 $N$ 的平方根。

---

## t-SNE 到 UMAP

UMAP 经常被认为仅仅是“快一点的 t-SNE”，但它们在损失函数上有本质区别。

t-SNE 仅使用 $KL(P||Q)$，而 UMAP 优化的是模糊集合的交叉熵（Cross Entropy）：

$$C_{UMAP} = \sum_{ij} [ p_{ij} \log \frac{p_{ij}}{q_{ij}} + (1 - p_{ij}) \log \frac{1 - p_{ij}}{1 - q_{ij}} ]$$

请注意这一项额外的 $(1 - p_{ij}) \log \frac{1 - p_{ij}}{1 - q_{ij}}$。

- t-SNE：只说了“邻居必须是邻居”。
- UMAP：不仅说了“邻居必须是邻居”，还强制要求“非邻居必须是非邻居”。

如果 $p_{ij} \approx 0$（高维非邻居），这一项迫使 $q_{ij}$ 也必须很小（低维必须离得远）。这就是为什么 UMAP 能够保留 Global Structure 的数学原因——它对“分离”施加了明确的惩罚，而 t-SNE 对此视而不见。

### 总结与展望

当我们使用 t-SNE 时，我们实际上是在做一个妥协：我们牺牲了长程距离的准确性，以换取局部结构的高保真展示。

- 不要过度解读 t-SNE 图上的簇间空白。
- 理解 KL 散度的非对称性，是避免过度解读的第一步。
- 如果在意全局拓扑（如拟时序分析），请使用 UMAP 或直接分析高维距离矩阵，而不是依赖 2D 散点图的视觉直觉。