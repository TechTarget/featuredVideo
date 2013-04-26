$(document).on('ready', function() {

  // init featuredVideo component
  $('.featuredVideo').featuredVideo({
    autoplayFirstVideo: false,
    supportsDeepLinking: true,
    showPlaylist: true,
    showPlaylistTooltips: true,
    tooltipHtml: '<div class="featuredVideoPlaylistTooltip"></div>'
  });

  // // temp
  // var overlay = $('<div>', {
  //   'class': 'featuredVideoPlayerOverlay'
  // });
  // overlay.on('click', function(e) {
  //   e.preventDefault();
  //   console.log('overlay clicked!');
  //   $(this).remove();
  // });
  // $('.featuredVideo').find('.featuredVideoPlayer').append(overlay);

});

  // var foo = brightcoveExp.getModule(brightcove.api.modules.APIModules.CONTENT);
  // var experience = window.brightcove.api.data.Media();
  // var currentVideo = self.player.getCurrentVideo();
  // console.log(e.target.__proto__.getSize());