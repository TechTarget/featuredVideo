$(document).on('ready', function() {

  // init plugin
  $('.featuredVideo').featuredVideo({
    autoplayFirstVideo: false,
    supportsDeepLinking: true,
    showPlaylist: true,
    showPlaylistTooltips: true,
    tooltipHtml: '<div class="featuredVideoPlaylistTooltip"></div>'
  });

});