
document.addEventListener('DOMContentLoaded', () => {
    const classesColumn = document.getElementById('classes-column');
    const addClassButton = document.getElementById('add-class-button');
    const trainModelButton = document.getElementById('train-model-button');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const webcamElement = document.getElementById('webcam');
    const predictionResultsElement = document.getElementById('prediction-results');
    const connections = document.getElementById('connections');
    const loadingOverlay = document.getElementById('loading-overlay');

    let classCounter = 0;
    let trainingData = [];
    let model;
    let mobilenet;
    let isCapturing = false;

    // --- UI Management ---

    const createClassCard = () => {
        classCounter++;
        const card = document.createElement('div');
        card.className = 'card class-card';
        card.dataset.classId = classCounter;

        let headerIcons = `
            <svg class="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        `;

        if (classCounter > 2) {
            headerIcons += `
                <svg class="remove-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            `;
        }

        card.innerHTML = `
            <div class="card-header class-card-header">
                <input type="text" value="Class ${classCounter}" />
                <div class="header-icons">
                    ${headerIcons}
                </div>
            </div>
            <div class="add-image-label">Click to Record Samples</div>
            <div class="action-buttons">
                <button class="webcam-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.6"></path><rect x="2" y="7" width="14" height="10" rx="2" ry="2"></rect></svg>
                    Webcam
                </button>
            </div>
            <div class="image-count">0 images</div>
        `;
        classesColumn.insertBefore(card, addClassButton);
        updateUIState();
        drawConnections();
    };

    const updateUIState = () => {
        const hasSamples = trainingData.length > 0;
        trainModelButton.disabled = !hasSamples;

        if (model) {
            previewPlaceholder.classList.add('hidden');
            webcamElement.classList.remove('hidden');
        } else {
            previewPlaceholder.classList.remove('hidden');
            webcamElement.classList.add('hidden');
        }
    };

    const drawConnections = () => {
        connections.innerHTML = '';
        const trainingNodeEl = document.getElementById('training-node');
        if (!trainingNodeEl) return;
        const trainingNodeRect = trainingNodeEl.getBoundingClientRect();
        const trainingNodeCenterY = trainingNodeRect.top + trainingNodeRect.height / 2;
        const trainingNodeX = trainingNodeRect.left;

        document.querySelectorAll('.class-card').forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterY = cardRect.top + cardRect.height / 2;
            const cardX = cardRect.right;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const controlPointX1 = cardX + 60;
            const controlPointX2 = trainingNodeX - 60;
            path.setAttribute('d', `M ${cardX} ${cardCenterY} C ${controlPointX1} ${cardCenterY}, ${controlPointX2} ${trainingNodeCenterY}, ${trainingNodeX} ${trainingNodeCenterY}`);
            path.setAttribute('stroke', '#ccc');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            connections.appendChild(path);
        });

        if (model) {
            const previewNodeEl = document.getElementById('preview-node');
            if(!previewNodeEl) return;
            const previewNodeRect = previewNodeEl.getBoundingClientRect();
            const previewNodeCenterY = previewNodeRect.top + previewNodeRect.height / 2;
            const previewNodeX = previewNodeRect.left;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const controlPointX1 = trainingNodeRect.right + 60;
            const controlPointX2 = previewNodeX - 60;
            path.setAttribute('d', `M ${trainingNodeRect.right} ${trainingNodeCenterY} C ${controlPointX1} ${trainingNodeCenterY}, ${controlPointX2} ${previewNodeCenterY}, ${previewNodeX} ${previewNodeCenterY}`);
            path.setAttribute('stroke', '#ccc');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            connections.appendChild(path);
        }
    };

    // --- TensorFlow.js Logic ---

    async function setupWebcam() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({ video: { width: 224, height: 224 } })
                .then(stream => {
                    webcamElement.srcObject = stream;
                    webcamElement.addEventListener('loadeddata', () => resolve(), false);
                })
                .catch(err => reject(err));
        });
    }

    async function captureSamples(classId) {
        if (!mobilenet) return;
        const image = tf.browser.fromPixels(webcamElement);
        const activation = mobilenet.infer(image, 'conv_preds');
        trainingData.push({ image: activation, label: parseInt(classId) });
        image.dispose();

        const card = document.querySelector(`[data-class-id='${classId}']`);
        const countElement = card.querySelector('.image-count');
        const currentCount = parseInt(countElement.innerText.split(' ')[0]) || 0;
        countElement.innerText = `${currentCount + 1} images`;
        updateUIState();
    }

    async function trainModel() {
        if (trainingData.length === 0) {
            console.error("No training data collected.");
            return;
        }

        trainModelButton.innerText = 'Training...';
        trainModelButton.disabled = true;

        const numClasses = document.querySelectorAll('.class-card').length;
        const xs = tf.concat(trainingData.map(d => d.image));
        const ys = tf.tidy(() => {
            const labels = trainingData.map(d => d.label - 1);
            return tf.oneHot(tf.tensor1d(labels, 'int32'), numClasses);
        });

        model = tf.sequential({
            layers: [
                tf.layers.dense({ units: 100, activation: 'relu', inputShape: trainingData[0].image.shape.slice(1) }),
                tf.layers.dense({ units: numClasses, activation: 'softmax' })
            ]
        });

        model.compile({ optimizer: tf.train.adam(0.0001), loss: 'categoricalCrossentropy' });

        await model.fit(xs, ys, {
            epochs: 20,
            callbacks: { onEpochEnd: (epoch, logs) => console.log(`Epoch ${epoch}: Loss = ${logs.loss}`) }
        });

        xs.dispose();
        ys.dispose();
        trainModelButton.innerText = 'Train Model';
        updateUIState();
        drawConnections();
        predict();
    }

    async function predict() {
        webcamElement.classList.remove('hidden');
        previewPlaceholder.classList.add('hidden');
        let lastPredictionTime = 0;
        const updateInterval = 333; // Approximately 3 times per second

        while (true) {
            const currentTime = performance.now();
            if (model && (currentTime - lastPredictionTime > updateInterval)) {
                const classCards = document.querySelectorAll('.class-card');
                const classNames = Array.from(classCards).map(card => card.querySelector('input').value);
                const image = tf.browser.fromPixels(webcamElement);
                const activation = mobilenet.infer(image, 'conv_preds');
                const prediction = model.predict(activation.reshape([1, -1]));
                const predictionData = await prediction.data();

                let resultsHtml = '';
                predictionData.forEach((confidence, index) => {
                    const confidencePercentage = Math.round(confidence * 100);
                    resultsHtml += `
                        <div class="prediction-bar-container">
                            <span class="prediction-label">${classNames[index]}</span>
                            <div class="prediction-bar-wrapper">
                                <div class="prediction-bar" style="width: ${confidencePercentage}%;"></div>
                            </div>
                            <span class="prediction-confidence">${confidencePercentage}%</span>
                        </div>
                    `;
                });
                predictionResultsElement.innerHTML = resultsHtml;

                image.dispose();
                activation.dispose();
                prediction.dispose();
                lastPredictionTime = currentTime;
            }
            await tf.nextFrame();
        }
    }

    async function init() {
        try {
            await setupWebcam();
            mobilenet = await window.mobilenet.load({ version: 2, alpha: 1.0 });
            // Directly manipulating the style is more robust
            loadingOverlay.style.display = 'none';
        } catch (err) {
            console.error("Initialization failed:", err);
            const p = loadingOverlay.querySelector('p');
            if (p) {
                p.innerText = "Initialization failed. Please grant webcam permissions and refresh.";
            }
        }
    }

    // --- Event Listeners ---
    addClassButton.addEventListener('click', createClassCard);
    trainModelButton.addEventListener('click', trainModel);

    classesColumn.addEventListener('click', e => {
        const webcamButton = e.target.closest('.webcam-button');
        if (webcamButton) {
            const card = e.target.closest('.class-card');
            const classId = card.dataset.classId;
            captureSamples(classId);
        }

        const removeButton = e.target.closest('.remove-icon');
        if (removeButton) {
            const cardToRemove = e.target.closest('.class-card');
            const classIdToRemove = parseInt(cardToRemove.dataset.classId);

            // Remove samples associated with the deleted class
            trainingData = trainingData.filter(d => d.label !== classIdToRemove);

            cardToRemove.remove();

            // Re-index class IDs and training data labels
            let newClassId = 1;
            document.querySelectorAll('.class-card').forEach(card => {
                const oldClassId = parseInt(card.dataset.classId);
                if (oldClassId !== newClassId) {
                    // Update training data labels for this class
                    trainingData.forEach(d => {
                        if (d.label === oldClassId) {
                            d.label = newClassId;
                        }
                    });
                    card.dataset.classId = newClassId;
                    card.querySelector('input').value = `Class ${newClassId}`;
                }
                newClassId++;
            });
            classCounter = newClassId - 1; // Update classCounter to reflect current number of classes

            drawConnections();
            updateUIState();
        }
    });

    // --- Initial State ---
    createClassCard();
    createClassCard();
    updateUIState();
    window.addEventListener('resize', drawConnections);
    init();
});
