//// STILL TO DO:

// add no class
// allow image upload
// capture first 30 frames

let net;

const webcamElement = document.getElementById('webcam');
const classifier = knnClassifier.create();


//Boilerplate for loading the webcam:
async function setupWebcam() {
  return new Promise((resolve, reject) => {
    const navigatorAny = navigator;
    navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({video: true},
        stream => {
          webcamElement.srcObject = stream;
          webcamElement.addEventListener('loadeddata',  () => resolve(), false);
        },
        error => reject());
    } else {
      reject();
    }
  });
}

async function app() {
  console.log('Loading mobilenet..');

  // Load the model.
  net = await mobilenet.load();
  console.log('Sucessfully loaded model');

  //wait for the webcam to initialize:
  await setupWebcam();

  // Reads an image from the webcam and associates it with a specific class index.
  const addExample = classId => {
    // Get the intermediate activation of MobileNet
    // 'conv_preds' and pass that to the KNN classifier.
    const activation = net.infer(webcamElement, 'conv_preds');

    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);
  };

  // When clicking a button, add an example for that class.
  document.getElementById('class-a').addEventListener('click', () => addExample(0));
  document.getElementById('class-b').addEventListener('click', () => addExample(1));
  document.getElementById('class-c').addEventListener('click', () => addExample(2));

  // document.getElementById('ul-class-a').addEventListener('click', () => addExample(0));
  // document.getElementById('ul-class-b').addEventListener('click', () => addExample(1));
  // document.getElementById('ul-class-c').addEventListener('click', () => addExample(2));


  while (true) {
    if (classifier.getNumClasses() > 0) {
      // Get the activation from mobilenet from the webcam.
      const activation = net.infer(webcamElement, 'conv_preds');
      // Get the most likely class and confidences from the classifier module.
      const result = await classifier.predictClass(activation);
      const classes = ['A', 'B', 'C'];

      // Create a dictionary for adding highlight to the buttons:
      const class_dict = {A: '#class-a', B: '#class-b', C: '#class-c'};

      //Create a threshold so we avoid prediction if the confidence is too low:
      if((result.confidences[result.classIndex.value]) <= 0.667) {
        document.getElementById('console').innerText = `
          Prediction: Hmmm... 'No Class' \n
          Probability: ${(result.confidences[result.classIndex]* 100).toFixed(2) + '%'}
          <strong>is too low!</strong> Trust your own judgement, Human!
        `;
      } else {

        // Remove the existing highlights class from buttons:
        $('*.button_capture').removeClass('highlight');

        // Label our positive result & add the highlight:
        var elem = classes[result.classIndex];
        $(class_dict[elem]).addClass('highlight');

        // Do a little formatting to get % instead of a float, then output the prediction:
        document.getElementById('console').innerText = `
        Prediction: ${classes[result.classIndex]}\n
        Probability: ${(result.confidences[result.classIndex] * 100).toFixed(2) + '%'}
        `;
      }
    }
    await tf.nextFrame();
  }
}

app();
