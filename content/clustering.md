---
{"publish":true,"created":"2025-11-26T10:43:23.383+08:00","modified":"2025-11-29T19:09:35.981+08:00","cssclasses":""}
---

# kmeans

## motivation

在给定数据点，指定k个cluster center，每个点的label被其最接近center决定。要求每个点距离最近center的距离的平方和最小。

损失函数
$$
\min_{\{ C_{k} \}, \{ \mu_{k} \}} \sum_{k=1}^K \sum_{x_{i} \in C_{k}} (x_{i} - \mu_{k})^2
$$
## Lloyd算法

1. 随机选择k个点作为center 
2. 根据center确定所有点的label
3. 根据labels确定center
4. 叠代直至loss不再减小



### 和GMM/EM的关系

k-means 可以看作是高斯混合模型（Gaussian Mixture Model, GMM）的一个特殊情况（等方差、独立同分布、协方差趋于 0、只做硬指派）

这个受约束GMM模型的 EM算法，退化为k-means Lloyd算法。


# SVD

V反应最大方差方向，$\Sigma$反映了方向对于总方差贡献，$U\Sigma$ 始样本在新方向上的坐标
$$
X = U \Sigma V^T
$$

# PCA

## motivation

高维空间里“有意义的变化”只集中在少数方向，但噪音在所有方向都存在。我们想找一个低维空间，让数据投影下来后, 信息损失最小/重构代价最小或者 方差最大
$$
\begin{align*}
u = \arg \max_{||u|| = 1} \text{Var}(Xu) \\
= \arg \max_{||v||=1} v^T X^T X v
\newline
\min_{\text{rank}(Z)=k} ||X-Z||^2
\end{align*}
$$
选择方差最大方向和最小重构代价实际上是等价的
可以看到方差最大方向就是对应SVD中的V的第一个特征向量
$U_{1}\Sigma_{1}V_{1}^T$ 也是所有rank=1中重构代价最小的

![[Pasted image 20251127091613.png]]

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_swiss_roll

np.random.seed(0)
mean = [0, 0]
cov = [[3, 2.5],
       [2.5, 3]]
X = np.random.multivariate_normal(mean, cov, 300)

# Center
X_centered = X - X.mean(axis=0)

# SVD
U, S, Vt = np.linalg.svd(X_centered, full_matrices=False)
V = Vt.T

# Plot data and principal component directions
plt.figure(figsize=(6,6))
plt.scatter(X_centered[:,0], X_centered[:,1])
origin = np.array([[0,0],[0,0]])
plt.quiver(*origin, V[0]*S[0], V[1]*S[0], angles='xy', scale_units='xy', scale=1)
plt.quiver(*origin, V[0]*S[1], V[1]*S[1], angles='xy', scale_units='xy', scale=1)
plt.title("Data and PCA directions via SVD")
plt.gca().set_aspect('equal')
plt.show()
```

## 不能处理非线性结构

散点集合X组成线性结构，如果
$$
\exists A \in R^{d \times k}, Z \in R^{k \times n}, s.t. X = AZ
$$
那么X的所有的样本落在A的列空间内

**流形**（manifold）每个点局部像k维欧氏空间，但是整体形状是弯曲的。 
比如螺旋、S 曲线、瑞士卷、发育轨迹、细胞分化轨迹都是流形结构。
$$
\begin{align*}
\text{螺旋: }
x(t) & = \left[\begin{array}{l}
t \cos t \\
t \sin t
\end{array}\right] \\
\newline \text{圆: }
x(t) & = \left[\begin{array}{l}
\cos t \\
\sin t
\end{array}\right] \\
\newline
\text{瑞士卷: }
x(t, y) & = \left[\begin{array}{c}
t \cos t \\
y \\
t \sin t
\end{array}\right]
\end{align*}
$$
即使数据真实结构是非线性的，PCA 只能找一个全局直线方向 → 所以必然发生“折叠”、“压扁”、“重叠”。

# tSNE

## motivation

降维后保持数据中的局部结构

## 计算

计算每个相邻点之间互为邻居的概率（使用高斯分布密度定义）
$$
\begin{align*}
p_{j|i} = \frac{\exp\left( \frac{{||x_{i} - x_{j}||^2}}{\sigma_{i}^2} \right)}{\sum} \\
p_{i,j} = \frac{p_{j|i}+p_{i|j}}{2} \\

\end{align*}
$$
假定数据结构在局部是均匀的：每个点的有效邻居数量应该大致相同（通过调整邻域宽度 $\sigma_{i}$ 实现）
在二维空间生成同样数量的点，使用t分布（而非正态分布）构造邻居概率
	使得点的距离能够合理展开
$$
q_{i,j} = \frac{1 + ||y_{i} - y_{j}||^{-2}}{\sum}
$$
最小化二者分布的KL散度
$$
KL(P||Q) = \sum_{i,j}  p_{i,j}\log \frac{p_{i,j}}{q_{i,j}}
$$

> [!NOTE] 为什么tSNE全局结构不可信
> 在上面的损失式子中，只有 ‘让相邻的点保持类似相邻的信息’ 而对于互相远离的点 $1-p_{i,j}$ 这个损失并没有告诉应该怎样做（没有被考虑）

## 结果

### 高斯噪声blob
PCA聚类结果
![[Pasted image 20251127205811.png]]

tSNE聚类结果
![[Pasted image 20251127205840.png]]

```bash
iter  100, KL = 79.1806
iter  200, KL = 79.3991
iter  300, KL = 3.7956
iter  400, KL = 3.5051
iter  500, KL = 3.4425
iter  600, KL = 3.3970
iter  700, KL = 3.3921
iter  800, KL = 3.3925
iter  900, KL = 3.3948
iter 1000, KL = 3.3968
iter 1100, KL = 3.3988
iter 1200, KL = 3.4008
iter 1300, KL = 3.4029
iter 1400, KL = 3.4047
iter 1500, KL = 3.4067
iter 1600, KL = 3.4088
```

### swiss roll

![[Pasted image 20251127211121.png]]

tsne result
![[Pasted image 20251127211236.png]]
可以看到全局图形变得和swiss roll完全没关系了（全局结构被扭曲）

PCA
![[Pasted image 20251127211249.png]]
选择的是swiss roll的纵切面的两个方向（方差最大方向）

为什么必须先做PCA
计算复杂度较高，PCA50可以保留足够信息同时减小计算量。

为什么出现团块拥挤？如何避免
使用尾部较高的倒数能够减少点之间的聚集

全局不可解释
由于整个计算过程之关系点局部邻居之间的关系得到保留，因此全局结构会被强烈扭曲。

## 实现

```python
import numpy as np
from sklearn.decomposition import PCA

def _pairwise_dist_sq(X):
    sum_X = np.sum(X ** 2, axis=1)
    # ||x_i - x_j||^2 = ||x_i||^2 + ||x_j||^2 - 2 x_i^T x_j
    D = np.add.outer(sum_X, sum_X) - 2 * X @ X.T
    D[D < 0] = 0.0  # 数值误差修正
    return D


def _H_and_pj_given_i(Di, beta):
    """
    对单个样本 i：
      Di: (n,) 与所有点的平方距离
      beta: 标量 = 1 / (2 sigma_i^2)
    返回:
      H  : 熵 (natural log)
      Pi : 条件概率 p_{j|i}
    """
    P = np.exp(-Di * beta)
    P[Di == 0] = 0.0  # 去掉自身
    sumP = np.sum(P)
    if sumP == 0.0:
        return 0.0, np.zeros_like(P)
    P /= sumP
    H = -np.sum(P[P > 0] * np.log(P[P > 0]))
    return H, P


def _compute_P(X, perplexity=30.0, tol=1e-5):
    """
    从高维数据 X 计算对称的联合概率 P_ij。
    使用二分搜索为每个点找到合适的 sigma_i（即 beta_i）。
    """
    n = X.shape[0]
    D = _pairwise_dist_sq(X)

    P = np.zeros((n, n), dtype=np.float64)
    beta = np.ones(n, dtype=np.float64)
    logU = np.log(perplexity)

    for i in range(n):
        Di = D[i, :]

        betamin, betamax = -np.inf, np.inf
        H, thisP = _H_and_pj_given_i(Di, beta[i])
        Hdiff = H - logU

        # 二分搜索 beta_i，使得 entropy 接近 log(perplexity)
        tries = 0
        while np.abs(Hdiff) > tol and tries < 50:
            if Hdiff > 0:
                # 熵太大 → 分布太平 → beta 要变大（sigma 变小）
                betamin = beta[i]
                beta[i] = beta[i] * 2.0 if np.isinf(betamax) else (beta[i] + betamax) / 2.0
            else:
                # 熵太小 → 分布太尖 → beta 要变小（sigma 变大）
                betamax = beta[i]
                beta[i] = beta[i] / 2.0 if np.isinf(betamin) else (beta[i] + betamin) / 2.0

            H, thisP = _H_and_pj_given_i(Di, beta[i])
            Hdiff = H - logU
            tries += 1

        P[i, :] = thisP

    # 对称化 + 归一化：p_{ij} = (p_{i|j} + p_{j|i}) / (2N)
    P = (P + P.T) / (2.0 * n)
    P = np.maximum(P, 1e-12)
    return P


def tsne_from_scratch(
    X,
    n_components=2,
    perplexity=30.0,
    n_iter=1000,
    learning_rate=None,
    early_exaggeration=12.0,
    early_exaggeration_iters=250,
    pca_dims=50,
    random_state=0,
    verbose=True,
):
    rng = np.random.RandomState(random_state)
    n, d = X.shape

    # ---------- 0. PCA 预处理（去噪 + 降维） ----------
    if pca_dims is not None and pca_dims < d:
        pca_hd = PCA(n_components=pca_dims, random_state=random_state)
        X_hd = pca_hd.fit_transform(X)
    else:
        X_hd = X - X.mean(axis=0)

    # ---------- 1. 计算高维概率矩阵 P ----------
    P = _compute_P(X_hd, perplexity=perplexity)
    P *= early_exaggeration

    # ---------- 2. 初始化低维嵌入 Y：用 PCA 而不是随机 ----------
    pca_ld = PCA(n_components=n_components, random_state=random_state)
    Y = pca_ld.fit_transform(X_hd).astype(np.float64)
    # 标准化尺度，避免一开始就距离过大或过小
    Y /= np.std(Y[:, 0])
    Y -= Y.mean(axis=0)

    if learning_rate is None:
        learning_rate = max(50.0, n / 12.0)  # Hinton 建议
    momentum = 0.8
    Y_inc = np.zeros_like(Y)

    # ---------- 4. 迭代优化 KL(P || Q) ----------
    for it in range(n_iter):
        # 4.1 计算低维 pairwise Student-t 相似度
        sum_Y = np.sum(Y ** 2, axis=1)
        # num_ij = (1 + ||y_i - y_j||^2)^{-1}
        num = 1.0 / (1.0 + np.add.outer(sum_Y, sum_Y) - 2.0 * (Y @ Y.T))
        np.fill_diagonal(num, 0.0)
        num = np.maximum(num, 1e-12)

        Q = num / np.sum(num)
        Q = np.maximum(Q, 1e-12)

        # 4.2 计算梯度：grad_i = 4 * sum_j (P_ij - Q_ij) * num_ij * (y_i - y_j)
        PQ = (P - Q) * num  # (n, n)
        # s_i = sum_j PQ_ij
        s = np.sum(PQ, axis=1)  # (n,)
        # grad = 4 * ( y_i * s_i - sum_j PQ_ij * y_j )
        grad = 4.0 * (Y * s[:, None] - PQ @ Y)

        # 4.3 更新 Y（简单 momentum）
        Y_inc = momentum * Y_inc - learning_rate * grad
        Y += Y_inc

        # 4.4 强制居中（平移不变性）
        Y -= Y.mean(axis=0)

        # 4.5 结束 early exaggeration
        if it == early_exaggeration_iters:
            P /= early_exaggeration

        # 4.6 可选：监控 KL loss
        if verbose and (it + 1) % 100 == 0:
            kl = np.sum(P * np.log(P / Q))
            print(f"iter {it+1:4d}, KL = {kl:.4f}")

    return Y
```


swiss roll对比
```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_swiss_roll
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

# Generate Swiss roll
X, t = make_swiss_roll(n_samples=1500, noise=0.05, random_state=42)

# 3D visualization
fig = plt.figure(figsize=(8, 7))
ax = fig.add_subplot(111, projection='3d')

p = ax.scatter(X[:, 0], X[:, 1], X[:, 2], c=t, cmap='Spectral', s=8)

ax.set_title("True 3D Swiss Roll Geometry")
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_zlabel("Z")

fig.colorbar(p, label="Intrinsic parameter t")
plt.show()
```


```python
X = X.astype(np.float64)

Y_tsne = tsne_from_scratch(
    X,
    n_components=2,
    perplexity=40.0,
    n_iter=800,
    pca_dims=50,
    random_state=0,
    verbose=True,
)

plt.figure(figsize=(7, 7))
plt.scatter(Y_tsne[:, 0], Y_tsne[:, 1], c=t, cmap="Spectral", s=5)
plt.gca().set_aspect("equal", "box")
plt.title("t-SNE from scratch on Swiss Roll")
plt.colorbar(label="Intrinsic parameter t")
plt.show()

from sklearn.decomposition import PCA
X_pca2 = PCA(n_components=2).fit_transform(X)

plt.figure(figsize=(7, 7))
plt.scatter(X_pca2[:, 0], X_pca2[:, 1], c=t, cmap="Spectral", s=5)
plt.gca().set_aspect("equal", "box")
plt.title("PCA on Swiss Roll (fails to unwrap the manifold)")
plt.colorbar(label="Intrinsic parameter t")
plt.show()
```
# UMAP

## motivation

保留局部结构
	每个点周围有着相同数量的邻居
	距离点更远点的临界信息不可信
保留一定的全局结构
使用KNN定义邻居（超参数`n_neighbor`）
定义邻居之间连接强度（0-1）（其中最近邻居连接强度为1）
$$
\exp -\left( \frac{d_{i,j}- \min(\{ d_{i,j} \})}{\sigma_{i}} \right)
$$
重新生成随机点，定义他们之间的距离
$$
q_{i,j} = \frac{1}{||y_{i} - y_{j}||^k + a}
$$
最小化Cross Entropy loss
$$
CE = p_{i,j} \log q_{i,j} + (1-p_{i,j}) \log q_{i,j}
$$

为什么比tSNE更适合保留全局结构，更适合trajectory，的含义（如何反应全局/局部平衡）


leiden是什么？如何利用降维信息的？

总结

| 方法      | 全局结构      | 局部结构     | 说明        |
| ------- | --------- | -------- | --------- |
| PCA     | ✓ 好       | ✗        | 唯一可信的全局结构 |
| k-means | ✗（只关心局部簇） | ✓        |           |
| t-SNE   | ✗         | ✓ 强调局部邻域 | 全局形状不可信   |
| UMAP    | 中等        | ✓        |           |
| Leiden  | 图结构完全决定   | ✓        |           |
## 结果

swiss roll
![[Pasted image 20251129190920.png]]
## 实现

```python
import numpy as np
from sklearn.decomposition import PCA


# --- Utility: pairwise squared distances (same as in t-SNE code) ---
def _pairwise_dist_sq(X):
    sum_X = np.sum(X ** 2, axis=1)
    D = np.add.outer(sum_X, sum_X) - 2 * (X @ X.T)
    D[D < 0] = 0
    return D


# --- Step 1: Compute kNN graph ---
def _knn_indices_and_dists(X, n_neighbors):
    """
    Return:
        indices: (n, k)   neighbor indices
        dists  : (n, k)   distances
    """
    D = _pairwise_dist_sq(X)
    idx = np.argsort(D, axis=1)[:, 1:n_neighbors+1]
    d = np.take_along_axis(D, idx, axis=1)
    return idx, np.sqrt(d)


# --- Step 2: Compute sigma_i, rho_i for each point ---
def _smooth_knn_dist(dists, local_connectivity=1, tol=1e-5):
    """
    Solve for sigma_i s.t.
        sum_j exp(-(d_ij - rho_i)/sigma_i) = log2(k)
    """
    n, k = dists.shape
    sigmas  = np.zeros(n)
    rhos    = np.zeros(n)

    target = np.log2(k)

    for i in range(n):
        di = dists[i]

        # rho_i = distance to the local_connectivity-th neighbor
        rhos[i] = di[local_connectivity - 1]

        lo, hi = 1e-3, 1e3
        for _ in range(50):
            mid = 0.5 * (lo + hi)
            psum = np.sum(np.exp(-(di - rhos[i]) / mid))
            if abs(psum - target) < tol:
                break
            if psum > target:
                lo = mid
            else:
                hi = mid

        sigmas[i] = mid

    return sigmas, rhos


# --- Step 3: Construct fuzzy simplicial complex (P matrix) ---
def _compute_fuzzy_membership(n, knn_idx, knn_dist, sigmas, rhos):
    rows = []
    cols = []
    vals = []

    for i in range(n):
        for j_idx in range(knn_idx.shape[1]):
            j = knn_idx[i, j_idx]
            dij = knn_dist[i, j_idx]

            if dij - rhos[i] <= 0:
                weight = 1.0
            else:
                weight = np.exp(-(dij - rhos[i]) / sigmas[i])

            rows.append(i)
            cols.append(j)
            vals.append(weight)

    P = np.zeros((n, n))
    P[rows, cols] = vals

    # fuzzy union
    P = P + P.T - P * P.T
    P = np.clip(P, 1e-12, 1.0)
    return P


# --- Step 4: Low-dimensional kernel q_ij ---
def _umap_low_dim_affinity(Y, a=1.577, b=0.895):
    n = Y.shape[0]
    sum_Y = np.sum(Y ** 2, axis=1)
    dist2 = np.add.outer(sum_Y, sum_Y) - 2 * (Y @ Y.T)
    dist2 = np.maximum(dist2, 0)

    Q = 1 / (1 + a * (dist2 ** b))
    np.fill_diagonal(Q, 0.0)
    Q = np.maximum(Q, 1e-12)
    return Q


# --- Step 5: Optimize cross-entropy ---
def umap_from_scratch(
    X,
    n_components=2,
    n_neighbors=15,
    n_epochs=500,
    learning_rate=1.0,
    pca_dims=50,
    random_state=0,
    verbose=True,
):
    """
    Minimal UMAP implementation.
    """

    rng = np.random.RandomState(random_state)
    n, d = X.shape

    # --- PCA pre-processing ---
    if pca_dims < d:
        X_hd = PCA(n_components=pca_dims, random_state=random_state).fit_transform(X)
    else:
        X_hd = X

    # --- Step 1: kNN graph ---
    knn_idx, knn_dist = _knn_indices_and_dists(X_hd, n_neighbors)

    # --- Step 2: compute sigma_i, rho_i ---
    sigmas, rhos = _smooth_knn_dist(knn_dist)

    # --- Step 3: fuzzy complex P ---
    P = _compute_fuzzy_membership(n, knn_idx, knn_dist, sigmas, rhos)

    # --- Step 4: Initialize Y using PCA ---
    Y = PCA(n_components=n_components, random_state=random_state).fit_transform(X_hd)
    Y = Y / np.std(Y[:, 0])
    Y -= Y.mean(axis=0)

    # constants for low-dimensional kernel
    a, b = 1.577, 0.895

    # --- Step 5: gradient descent on cross-entropy ---
    for epoch in range(n_epochs):
        Q = _umap_low_dim_affinity(Y, a=a, b=b)

        # cross entropy gradient:
        # dL/dy_i = sum_j [ p_ij * d(-log q_ij)/dy_i  + (1-p_ij) * d(log(1-q_ij))/dy_i ]
        # Simplified implementation:

        positive = P * Q * (a * b)  # attraction
        negative = (1 - P) * (1 - Q) * (a * b)  # repulsion

        grad = np.zeros_like(Y)

        # Compute direction vector for each pair
        sum_Y = np.sum(Y ** 2, axis=1)
        dist2 = np.add.outer(sum_Y, sum_Y) - 2 * (Y @ Y.T)
        dist2 = np.maximum(dist2, 1e-7)
        dist = np.sqrt(dist2)

        dir_vec = (Y[:, None, :] - Y[None, :, :]) / dist[:, :, None]

        grad += np.sum((positive - negative)[:, :, None] * dir_vec, axis=1)

        Y -= learning_rate * grad
        Y -= Y.mean(axis=0)

        if verbose and (epoch + 1) % 100 == 0:
            print(f"Epoch {epoch+1}/{n_epochs}")

    return Y

from sklearn.datasets import make_swiss_roll
import matplotlib.pyplot as plt

X, t = make_swiss_roll(n_samples=1500, noise=0.05, random_state=42)

Y_umap = umap_from_scratch(
    X,
    n_components=2,
    n_neighbors=30,
    n_epochs=400,
    pca_dims=30,
    random_state=0,
)

plt.figure(figsize=(7,7))
plt.scatter(Y_umap[:,0], Y_umap[:,1], c=t, cmap="Spectral", s=5)
plt.title("UMAP from scratch")
plt.gca().set_aspect("equal", "box")
plt.show()

```