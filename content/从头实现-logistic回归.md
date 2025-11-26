---
{"publish":true,"created":"2025-10-30T22:40:25.000+08:00","modified":"2025-10-30T22:40:25.000+08:00","cssclasses":""}
---

## Motivation

[[从头实现-线性回归\|线性回归]]用于分类问题存在两个问题
1. 预测结果 $\hat{y}$ 没有限制，可能小于0或大于1，无法解释为概率
2. 平方损失函数不适合分类问题(非凸)
## Model


| 符号      | 含义                       |
| ------- | ------------------------ |
| $x_i$   | 样本i的特征向量（维度为d，特征均为连续数值变量 |
| $y_i$   | 样本i的真实标签（0/1/2/...）      |
| $p_{j}$ | 某样本，经model计算为j类的概率       |
| $l_i$   | 样本i的交叉熵损失                |

注意区分i，j
$$
\begin{align*}
\text{for sample } i, \,
\hat y_j = \vec{\omega}^T_j \vec{x_j} + b \\
p_j = \frac{e^{\hat{y}_j}}{\sum_i e^{\hat y_j}} \\
l_i = -\sum_j y_j \log p_j \\
\end{align*}
$$
## 梯度下降求解

$$
\begin{align*}
l_i &= -\sum_j y_j \log p_j \\ 
&= -\sum_j (y_j \log \frac{e^{\hat{y}_j}}{\sum_i e^{\hat y_j}}) \\
&= - \sum_j y_j \hat{y}_j + \sum_j y_j \log \sum_i e^{\hat{y}_i}\\
&= - \sum_j y_j \hat{y}_j  + \log \sum_i e^{\hat{y}_i} \, \because y_j只有j=k时等于1其他均为0\\
\therefore 
\frac{\partial l_i}{\partial \hat{y}_i} &= -y_j + p_j\\
... \\
\frac{\partial l_i}{\partial \vec\omega_j} &= \vec{x}_i(-y_j + p_j) \\
\frac{\partial l_i}{\partial b_j} &= -y_j + p_j
\end{align*}
$$

## 实现

```python
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from sklearn.base import BaseEstimator, ClassifierMixin

## 生成多分类数据
X, y = make_classification(
    n_samples=200, n_features=20, n_redundant=0, n_classes=3,
    n_informative=4, n_clusters_per_class=1, random_state=42
)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

## 实现多分类逻辑回归
class SoftmaxRegression(BaseEstimator, ClassifierMixin):
    def __init__(self, lr=0.01, n_iter=1000):
        self.lr = lr
        self.n_iter = n_iter

    def _softmax(self, Z):
        exp_Z = np.exp(Z)
        return exp_Z / np.sum(exp_Z, axis=1, keepdims=True)

    def fit(self, X, y):
        n, d = X.shape
        self.classes_ = np.unique(y)
        K = len(self.classes_)

        # 初始化参数
        self.W = np.zeros((d, K))
        self.b = np.zeros(K)

        # one-hot 编码标签
        Y = np.eye(K)[y]

        for _ in range(self.n_iter):
            Z = X @ self.W + self.b
            Y_hat = self._softmax(Z)

            grad_W = (X.T @ (Y_hat - Y)) / n
            grad_b = np.mean(Y_hat - Y, axis=0)

            self.W -= self.lr * grad_W
            self.b -= self.lr * grad_b

        return self

    def predict_proba(self, X):
        Z = X @ self.W + self.b
        return self._softmax(Z)

    def predict(self, X):
        return np.argmax(self.predict_proba(X), axis=1)

model = SoftmaxRegression(lr=0.001, n_iter=10) # SoftmaxRegression 
model.fit(X_train, y_train)
y_pred = model.predict(X_train)

print("Accuracy:", accuracy_score(y_train, y_pred))
```