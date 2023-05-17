var localStream;
var peerConnection;

let channel = null

function createPeerConnection(number) {
    // Create a new RTCPeerConnection
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });



    peerConnection.addStream(localStream);
    // Event handler for ICE candidates
    peerConnection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            // Send ICE candidate to the other client
            socket.send(JSON.stringify({
                type: 'iceCandidate',
                number: number,
                data: event.candidate
            }));
        }
    });

    // Event handler for receiving remote audio tracks
    peerConnection.addEventListener('track', (event) => {
        if (event.track.kind === 'audio') {
            // Add the remote audio track to the audio element
            remoteAudio.srcObject = event.streams[0];
        }
    });
    return peerConnection;

}


var localStream;

// Get user media for audio
navigator.mediaDevices.getUserMedia({ audio: true })
.then((stream) => {
  const audioTrack = stream.getAudioTracks()[0];
  localStream = new MediaStream([audioTrack]);
})
.catch((error) => {
  console.log('Error accessing user media:', error);
});



function startCallAndCreateOffer() {
    let number = document.getElementById('number').value;

    // Create a new RTCPeerConnection
    createPeerConnection(number);

    // Add the local audio stream to the peer connection
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    // Create and send offer
    peerConnection.createOffer()
        .then((offer) => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            // Send offer to the other client
            socket.send(JSON.stringify({
                type: 'CALL_OFFER',
                caller: my_number,
                number: number,
                data: peerConnection.localDescription
            }));
        })
        .catch((error) => {
            console.log('Error creating offer:', error);
        });
}

function startCallAndHandleOffer(parsed) {
   
    // Create a new RTCPeerConnection
    createPeerConnection(parsed.caller);

    // Add the local audio stream to the peer connection
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });
    handleOffer(parsed);
}


function handleOffer(parsed) {
    // Set remote description and create answer
    peerConnection.setRemoteDescription(new RTCSessionDescription(parsed.data))
        .then(() => {
            return peerConnection.createAnswer();
        })
        .then((answer) => {
            return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            // Send the answer back to the caller
            socket.send(JSON.stringify({
                type: 'CALL_ANSWER',
                caller: my_number,
                number: parsed.caller,
                data: peerConnection.localDescription
            }));
        })
        .catch((error) => {
            console.log('Error handling offer:', error);
        });
}


function handleAnswer(number, answer) {
    // Set the remote description with the answer
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            console.log('Answer from', number, 'is set as remote description.');
        })
        .catch((error) => {
            console.log('Error handling answer:', error);
        });
}

function handleIceCandidate(candidate) {
    // Add the received ICE candidate to the peer connection
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .then(() => {
        console.log('ICE candidate added successfully.');
      })
      .catch((error) => {
        console.log('Error adding ICE candidate:', error);
      });
}
