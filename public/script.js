var modal = document.getElementById("myModal");
var joinBtn = document.getElementById("joinRoomBtn");
var span = document.getElementsByClassName("close")[0];
var playerName = document.getElementById("playerName");
var screenBtn = document.getElementById("screenShare");

span.onclick = function() {
  modal.style.display = "none";
}

joinBtn.onclick = function() {
  let roomId = document.getElementById("roomToConnect").value;
  window.location.replace("https://immense-coast-37484.herokuapp.com/" + roomId);
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: '443'
})
let myVideoStream;
let currentStream;

const myVideoBox = document.createElement('div')
const myVideo = document.createElement('video')
myVideoBox.appendChild(myVideo)
myVideo.muted = true
const peers = {}

window.navigator.mediaDevices.enumerateDevices()
.then(function(devices) {
  hasCam = devices.some(function(d) { return d.kind == "videoinput"; });
  hasMic = devices.some(function(d) { return d.kind == "audioinput"; });

  window.navigator.mediaDevices.getUserMedia({
    video: hasCam,
    audio: hasMic
  }).then(stream => {
    myVideoStream = stream;
    currentStream = stream;
    addVideoStream(myVideoBox, myVideo, stream)
  
    myPeer.on('call', call => {
      call.answer(currentStream)

      var videoBox = document.createElement('div')
      videoBox.id = call.peer
      peers[call.peer] = call
      var video = document.createElement('video')
      videoBox.appendChild(video)
      call.on('stream', userVideoStream => {
        addVideoStream(videoBox, video, userVideoStream)
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, currentStream)
    })

    myPeer.on('close', () => {
      socket.emit('leave-room', ROOM_ID, myPeer.id)
    })

    myPeer.on('error', (err) => {
      myPeer.reconnect();
    })

    socket.on('disconnect', function () {
      socket.emit('leave-room', ROOM_ID, myPeer.id)
    })

    socket.on("createMessage", message => {
      $("ul").append(`<li class="message"><b>user</b><br/>${message}</li>`);
      scrollToBottom()
    })

  }).catch(function(err) {
    console.log(err); /* handle the error */
    // if (err.name == "NotFoundError" || err.name == "DevicesNotFoundError") {
    //     // track is missing
    // } else if (err.name == "NotReadableError" || err.name == "TrackStartError") {
    //     //webcam or mic are already in use 
    // } else if (err.name == "OverconstrainedError" || err.name == "ConstraintNotSatisfiedError") {
    //     //constraints can not be satisfied by avb. devices 
    // } else if (err.name == "NotAllowedError" || err.name == "PermissionDeniedError") {
    //     //permission denied in browser 
    // } else if (err.name == "TypeError" || err.name == "TypeError") {
    //     //empty constraints object 
    // } else {
    //     //other errors 
    // }
  });
})


socket.on('user-disconnected', userId => {
  if (peers[userId]){
    peers[userId].close();
    document.getElementById(userId).remove();
  }
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  var videoBox = document.createElement('div')
  videoBox.id = userId
  var video = document.createElement('video')
  videoBox.appendChild(video)

  call.on('stream', userVideoStream => {
    addVideoStream(videoBox, video, userVideoStream)
  })

  peers[userId] = call
}

function addVideoStream(videoBox, video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(videoBox)
}

function leaveMeeting() {
  socket.disconnect();
  modal.style.display = "block";
  for (i = 0; i < peers.length; i++) {
    document.getElementById(peers[i]).remove();
  }
}

function sendMessage() {
  var msg = document.getElementById("chat_message").value;
  if (msg.length !== 0) {
    socket.emit('message', msg);
    document.getElementById("chat_message").value = '';
    $("ul").append(`<li class="message"><b>user</b><br/>${msg}</li>`);
    scrollToBottom()
  }
  return false;
}

const scrollToBottom = () => {
  var d = $('.main__chat_window');
  d.scrollTop(d.prop("scrollHeight"));
}

const muteUnmute = () => {
  const enabled = currentStream.getAudioTracks()[0].enabled;
  if (enabled) {
    currentStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    currentStream.getAudioTracks()[0].enabled = true;
  }
}

const playStop = () => {
  let enabled = currentStream.getVideoTracks()[0].enabled;
  if (enabled) {
    currentStream.getVideoTracks()[0].enabled = false;
    setPlayVideo()
  } else {
    setStopVideo()
    currentStream.getVideoTracks()[0].enabled = true;
  }
}

screenBtn.onclick = function() {
  window.navigator.mediaDevices.getDisplayMedia({
    cursor: true
  }).then( stream => {
    currentStream = stream;
    const screenTrack = stream.getTracks()[0]
    Object.keys(peers).forEach(function(key) {
      var sender = peers[key].peerConnection.getSenders().find(function(s) {
        return s.track.kind == "video";
      });
      sender.replaceTrack(screenTrack);
    });
    myVideo.srcObject = stream;

    screenTrack.onended = function() {
      Object.keys(peers).forEach(function(key) {
        var sender = peers[key].peerConnection.getSenders().find(function(s) {
          return s.track.kind == "video";
        });
        sender.replaceTrack(myVideoStream.getVideoTracks()[0]);
      });
      currentStream = myVideoStream;
      myVideo.srcObject = myVideoStream;  
    }
  })
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}
