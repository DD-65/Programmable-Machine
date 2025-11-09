*A small, browser-only experiment inspired by Google’s Teachable Machine*

## Overview

This project lets you train and run a simple image classifier directly in the browser without a server or installs. It captures examples from your webcam and fine-tunes a lightweight head on top of pretrained embeddings.

## Motivation

Teachable Machine is really good for showing or understanding the basics of neural networks / ML. I also wanted to experiment working with stuff like that using plain HTML/CSS/JS and TensorFlow.js, so everything is cross-platform and usable in the browser.

## Features
- In-browser training with TensorFlow.js
- MobileNet (or similar) as a feature extractor
- Live webcam capture for class examples
- Real-time prediction bars
- Zero build step: just open index.html

## Tech Stack
- TensorFlow.js for model definition and training
- @tensorflow-models/mobilenet for embeddings
- getUserMedia API for webcam access
- and of course HTML/CSS/JavaScript

## Getting Started
1.	Clone or download this repo.
2.	Open index.html in a modern browser.
3.	Allow webcam access when prompted.
4.	Create classes, collect samples, train, and look at the predictions.


## How It Works
1.	Collecting Samples: For each class, snapshots are passed through MobileNet to get embeddings.
2.	Training: A small dense classifier is then trained on those embeddings.
3.	Predict: Incoming frames are embedded and classified, updating the UI in real time.

## Roadmap / Ideas?
- Evaluation tools: confusion matrix, per-class accuracy
- Export to different formats (TF SavedModel, ONNX)
- ??
