---
{"publish":true,"created":"2025-11-23T08:31:49.000+08:00","modified":"2025-11-23T08:31:49.000+08:00","cssclasses":""}
---

参考官方教程
lightning.ai/docs/pytorch/stable/

好处
- 减少代码量
- 减少可能犯错的地方(梯度计算开/关，)
- 很多功能都可以快速实现(top3 checkpoint, early stop,)
两个类
lightning.module

```python
class LightningTransformer(L.LightningModule):
    def __init__(self, vocab_size):
        super().__init__()
        self.model = Transformer(vocab_size=vocab_size)
        self.training_step_outputs = []

	def training_step(self, batch, batch_idx):
	    inputs, target = batch
	    output = self.model(inputs, target)
	    loss = torch.nn.functional.nll_loss(output, target.view(-1))
	
	    # logs metrics for each training_step,
	    # and the average across the epoch, to the progress bar and logger
	    self.log("train_loss", loss, on_step=True, on_epoch=True, prog_bar=True, logger=True)
	    return loss

    def on_train_epoch_end(self):
        all_preds = torch.stack(self.training_step_outputs)
        # do something with all preds
        ...
        self.training_step_outputs.clear()  # free memory
```

相当于
```python
# enable gradient calculation
torch.set_grad_enabled(True)

outs = []
for epoch_i in range(epochs):
	for batch_idx, batch in enumerate(train_dataloader):
	    # forward
	    loss = training_step(batch, batch_idx)
	    outs.append(loss.detach())
	
	    # clear gradients
	    optimizer.zero_grad()
	    # backward
	    loss.backward()
	    # update parameters
	    optimizer.step()
	
	# note: in reality, we do this incrementally, instead of keeping all outputs in memory
	epoch_metric = torch.mean(torch.stack(outs))
	on_train_epoch_end()
```

trainer做的事情包括
- Automatically enabling/disabling grads
- Running the training, validation and test dataloaders
- Calling the Callbacks at the appropriate times
- Putting batches and computations on the correct devices

```python
# enable grads
torch.set_grad_enabled(True)

losses = []
for batch in train_dataloader:
    # calls hooks like this one
    on_train_batch_start()

    # train step
    loss = training_step(batch)

    # clear gradients
    optimizer.zero_grad()

    # backward
    loss.backward()

    # update parameters
    optimizer.step()

    losses.append(loss)
```

