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

// Main:
async function app() {
  //console.log('Loading mobilenet..');

  // Load the model.
  net = await mobilenet.load();
  //console.log('Sucessfully loaded model');

  //wait for the webcam to initialize:
  await setupWebcam();

  // Reads an image from the webcam and associates it with a specific class index.
  const addExample = classId => {
    // Get the intermediate activation of MobileNet 'conv_preds' and pass that to the KNN classifier.
    const activation = net.infer(webcamElement, 'conv_preds');
    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);
  };

// Create a timer to capture a few frames for the initial 'No-Class' state:

// Inform the user not to move the webcam:
document.getElementById('console').innerText = `
      CALIBRATING BASE CONDITIONS:
      Please wait a few seconds...
`;

// Capture the no class frames from webcam:
  var timesRun = 0;
  var interval = setInterval(function initNoClass(){
      timesRun += 1;
      if(timesRun === 10){
          clearInterval(interval);
      }
      addExample(0);
      document.getElementById("loading_bar").append("*");
  }, 500);

// Display loading complete message:
  setTimeout(loadComplete, 5000);
  function loadComplete(){
      document.getElementById("loading_bar").innerText = "Ready for Calissification!";
      document.getElementById("console").innerText = "<< This is the Empty Class >>";
  }

// Route input from the buttons
  document.getElementById('class-a').addEventListener('click', () => addExample(1));
  document.getElementById('class-b').addEventListener('click', () => addExample(2));
  document.getElementById('class-c').addEventListener('click', () => addExample(3));

// Run our samples from the webcam against the model:
  while (true) {
    if (classifier.getNumClasses() > 1) {
      // Get the activation from mobilenet from the webcam.
      const activation = net.infer(webcamElement, 'conv_preds');
      var result = await classifier.predictClass(activation);
      const classes = ['E', 'A', 'B', 'C'];

      // Create a dictionary for adding highlight to the buttons:
      const class_dict = {E: '', A: '#class-a', B: '#class-b', C: '#class-c'};

      // Check for 'No-Class':
      if ((classes[result.classIndex]) == 'E') {
        document.getElementById('console').innerText = `
          Prediction: This is the class of 'No Class'
        `;
        // Remove the existing highlights class from buttons:
        $('*.button_capture').removeClass('highlight');
      }
      else {
        //Create a threshold, so we avoid prediction if the confidence is too low:
        if ((result.confidences[result.classIndex]) <= 0.67) {
          document.getElementById('console').innerText = `
            Prediction: Hmmm ... uncertainty \n
            Probability: ${(result.confidences[result.classIndex] * 100).toFixed(2) + '%'} is too low!  Trust your own judgement, Human!
          `;
          // Remove the existing highlights class from buttons:
          $('*.button_capture').removeClass('highlight');
        }
        else {
          // Do a little formatting to get a % instead of float, then output the prediction:
          document.getElementById('console').innerText = `
            Prediction: ${classes[result.classIndex]}\n
            Probability: ${(result.confidences[result.classIndex] * 100).toFixed(2) + '%'}
          `;
          // Remove the existing highlights class from buttons:
          $('*.button_capture').removeClass('highlight');
          // Label our positive result & add the highlight:
          var elem = classes[result.classIndex];
          $(class_dict[elem]).addClass('highlight');
        }
      }
    }
    await tf.nextFrame();
  }
}

app();
