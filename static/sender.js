var socket = io.connect(window.location.origin);

// global mic activateion flag
let micActive = false;

function updateMicInfo(){
    if (micActive){
        // change the mic icon and info to show that audio is being tranfer
        document.getElementById('MicIcon').setAttribute('src','static/img/mic_icon_on.png');
        document.getElementById('MicInfo').innerHTML = '(Microphone is ON)';
    } else {
        // change the mic icon and info to show that audio is being tranfer
        document.getElementById('MicIcon').setAttribute('src','static/img/mic_icon_off.png');
        document.getElementById('MicInfo').innerHTML = '(Microphone is OFF)';
    }
}

// STUN Server for NAT traversal
const rtcConfig = {
    iceServers: [
        { urls: ['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'] },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ]
};

const aud_effect_constraints = {
    echoCancellation : false
};

async function sendAudioStream() {
    // access the default mic of the device
    let stream;
    
    console.log('0 - Function started');
    try{
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch
    {
        console.log("Mic Permission dismissed");
        return;
    }
    
    console.log('1 - Audio found and added to stream');
    
    
    // make a p2p connection
    const peerConnection = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(track => {
        track.applyConstraints(aud_effect_constraints);
        peerConnection.addTrack(track, stream);
        console.log('XX - Track added to P2P', stream)
    });

    console.log('2 - PeerConnection variable made and stream added to it');

    // check for ice errors
    peerConnection.onicecandidateerror = (event) => {
        console.error("ICE Candidate Error:", event);
    };
    
    
    // send the input audio as an offer
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', { candidate: event.candidate, senderId: socket.id });
            console.log(event.candidate.candidate);
            console.log('XX - socket candidate emitted');

        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('3 - Offer generated');
    socket.emit('offer', {offer, senderId: socket.id });
    console.log('4 - socket Offer emitted');

    
    socket.on('answer', async ({ answer, remoteSenderID }) => {
        if(remoteSenderID == socket.id){
            // Set the remote description with the answer received from the receiver
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('XX - anser received and added for peer connection');
        }
    });

    // Handle ICE candidates from receiver
    socket.on('candidateRec', ({ candidate, originalSenderId }) => {
        console.log("CANDIDATE_REC", originalSenderId);
        if (originalSenderId == socket.id) {
            console.log("CANDIDATE_REC_PASS", candidate.candidate, originalSenderId);
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    // update mic info
    micActive = true;
    updateMicInfo();

}

// Random message generator for each used on Arrival
const welcomeMsgs = [
    'here/there',
    'you are remote',
    'miles of line'
];

function generate_welcomeMsg(){
    
    let msg_len = welcomeMsgs.length;
    let rand_msg;

    // generate a random number
    rand_msg = welcomeMsgs[Math.floor(Math.random()*msg_len)];
    // update the welcome text with random number
    document.getElementById('sender_welcome').innerHTML = rand_msg;

}