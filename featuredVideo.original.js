/*!
* Featured Video v1.0.5 (http://okize.github.com/)
* Copyright (c) 2013 | Licensed under the MIT license - http://www.opensource.org/licenses/mit-license.php
*/

// use AMD or browser globals to create a jQuery plugin.
;(function (factory) {

  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }

}(function ($) {

  'use strict';

  // defaults
  var pluginName = 'featuredVideo';
  var defaults = {
    autoplayFirstVideo: true, // play the first video automagically as soon as it's loaded
    defaultVideoId: false, // if set, this will be the first video that appear in player, regardless of playlist
    supportsDeepLinking: true, // supports appending videoId in url hash to link to any video in playlist
    showPlaylist: true, // show a playlist alongside the video player
    showPlaylistTooltips: true, // show 'tooltips' of the video summary inside the playlist
    tooltipHtml: '<div class="featuredVideoPlaylistTooltip"></div>' // html for dom element of tooltip
  };

  // plugin constructor
  var Video = function (element, options) {
    this.el = element;
    this.$element = $(this.el); // featured video component dom container
    this.options = $.extend({}, defaults, options);
    this.activeVideoId = null; // stores the video id of the video in the player
    this.hashVideoId = this.getVideoIdFromUrl(); // get video id from url hash
    this.player = this.$element.find('.featuredplayer'); // the video player dom element
    this.playlist = this.$element.find('.featuredVideoPlaylist'); // the playlist dom element
    this.playlistVideos = this.playlist.find('li'); // each video item in the playlist
    this.playlistVideosCount = this.playlistVideos.length; // count of videos in the playlist
    this.playlistFirstVideoEl = this.playlistVideos.eq(0); // first video element in playlist
    this.playlistFirstVideoId = this.playlistFirstVideoEl.data('videoId') || null; // id of first video in playlist
    this.playOnHashChange = true; // @todo
    this.init();
  };

  Video.prototype = {

    init: function() {

      // @todo
      this.sanityCheck();

      // @todo should we move this into playlist functionality?
      if (this.options.supportsDeepLinking) {
        this.initializeHashLinking();
      }

      // initialize video player
      this.getPlayer();

    },

    player: {}, // this will hold the api that brightcove returns

    sanityCheck: function () {

      // make sure there is at least one video in the playlist AND it has a video id
      if (this.playlistVideosCount <= 0 || (!this.playlistFirstVideoId || this.playlistFirstVideoId === '') ) {
        this.$element.hide();
        // @todo maybe instead of critical error it should just disable playlist?
        return $.error('no video ids specified in featured video playlist!');
      }

      // make sure that there are no duplicate ids in playlist array
      // if there are, remove from dom
      var dedupe = this.getDuplicatePlaylistIds();
      if (dedupe.length > 0) {
        console.error('WARNING! duplicate ids found in the featured video playlist: ', dedupe);
      }

    },

    getPlayer: function () {

      // config for 3rd party video player provider
      var playerScript = {
        url: 'http://admin.brightcove.com/js/BrightcoveExperiences.js', // brightcove script to load aysnc
        isLoaded: $(document).data('playerScriptLoaded') || false // check via data attr if the script has ben loaded yet
      };

      var self = this;

      // @todo get the 3rd party script if it hasn't been loaded yet
      var playerScriptIsLoaded = (!playerScript.isLoaded) ? this.loadPlayerScript(playerScript.url) : this.resolve();

      // load the brightcove script async
      $.when(playerScriptIsLoaded)
        .done(function () {
          self.initializePlayer();
        })
        .fail(function () {
          $.error('Brightcove script failed to load');
        });

    },

    loadPlayerScript: function (url) {

      // attempt to load 3rd party script and return promise
      var playerScriptIsLoaded = $.ajax( url, { dataType: 'script' });
      return playerScriptIsLoaded;

    },

    initializePlayer: function () {

      var self = this;

      // brightcove object
      var brightcove = window.brightcove || {};

      // all the data for player has been received by the browser
      // can now get references to the overall player and API modules
      window.brightcovePlayerLoaded = function (brightcovePlayerId) {

        var brightcoveExp = brightcove.api.getExperience(brightcovePlayerId);
        self.player = brightcoveExp.getModule(brightcove.api.modules.APIModules.VIDEO_PLAYER);

      };

      // the player has now been fully instantiated and
      // is ready to interact with via the API
      // only call methods of the API modules after the template ready event has fired
      window.brightcovePlayerReady = function () {

        // @todo need to determine if autoplay is appropriate
        // for example: if user is on this page and clicks, it should play automatically
        var playType = (self.options.autoplayFirstVideo) ? 'load' : 'cue';

        // add video to player
        self.playVideo(playType, self.getVideoId());

        // now can initialize the playlist to interact with the player
        self.initializePlaylist();

      };

      // no idea what this does, but if it's not here FF & IE9 won't work... go figure
      brightcove.createExperiences();

    },

    playVideo: function (playType, videoId, eventType) {

      if (typeof eventType === 'undefined') {
        eventType = 'none';
      }

      // @todo chould check how user arrived to page for accurate playType
      if (playType === 'load') {
        this.player.loadVideoByID( videoId );
      } else if (playType === 'cue') {
        this.player.cueVideoByID( videoId );
      }

      // if showing a playlist, 'select' the correct video in the list
      if (this.options.showPlaylist) {
        this.activatePlaylistItem(undefined, eventType);
      }

    },

    getVideoId: function (el) {

      // if an element is passed in, grab the video id from it's data attr
      if (typeof el !== 'undefined') {
        this.activeVideoId = el.data('videoId');
      }

      // check if there was a video id set in url hash
      // and check that videoid is a valid id inside the playlist
      else if (this.hashVideoId && this.hasValidId(this.hashVideoId)) {
        this.activeVideoId = this.hashVideoId;
      }

      // otherwise use the id of the first video in the playlist
      else {
        this.activeVideoId = this.playlistFirstVideoId;
      }

      return this.activeVideoId;

    },

    hasValidId: function (videoId) {

      var idList = this.getPlaylistIds();

      // check that the video id arg exists in the playlist
      // ie7/8 does not support array.indexOf
      for (var i = 0, len = idList.length; i < len; i++) {
        if (idList[i] === videoId) {
          return true;
        }
      }

      return false;

    },

    activatePlaylistItem: function ($el, eventType) {

      // if no element parameter passed, try to select el based on data-attr
      if (typeof $el === 'undefined') {
        $el = this.playlist.find('li[data-video-id="' + this.activeVideoId + '"]');
      }

      // make sure the playlist item can be seen in the playlist overflow
      // if it's from a click in the playlist, do nothing because it's
      // annoying to have the item you just clicked on jump to the top
      if (eventType !== 'click') {
        this.bringPlaylistItemIntoView( $el.get(0) );
      }

      // @todo, could select by eq if tracking the active video eq
      this.playlistVideos.removeClass('active');

      // apply class to active element
      $el.addClass('active');

    },

    bringPlaylistItemIntoView: function (el) {

      // if there's no el, just make it the first video
      if (typeof el === 'undefined') { return false; }

      // use scrollIntoViewIfNeeded if available, else fallback to scrollIntoView
      if (el.scrollIntoViewIfNeeded) {
        el.scrollIntoViewIfNeeded(true);
      } else {
        el.scrollIntoView(true);
      }

    },

    updateUrlHash: function (videoId) {

      // update url hash with current video id
      if (this.options.supportsDeepLinking) {
        window.location.hash = 'videoId=' + videoId;
      }

    },

    initializePlaylist: function () {

      // if playlist is not enabled, add a class to component, remove playlist from dom and exit
      // otherwise initialize the playlist
      if (!this.options.showPlaylist) {
        this.playlist.remove();
        this.$element.addClass('noPlaylist');
        return;
      }

      var self = this;

      // event handler for playlist clicks
      this.playlistVideos.on('click', function(e) {

        e.preventDefault();

        var videoId = $(this).data('videoId');

        self.updateUrlHash(videoId);

        self.activeVideoId = videoId;

        // don't want the hashchange to call it's handler when _click_ on video
        self.playOnHashChange = false;

        // play the selected video
        self.playVideo('load', videoId, e.type);

      });

      // if video tooltips are enabled, initialize them
      if (this.options.showPlaylistTooltips) {
        this.initializePlaylistTooltips();
      }

      // show the playlist
      this.playlist.css('visibility', 'visible');

    },

    initializePlaylistTooltips: function () {

      // dom element that contains 'tooltip'
      var tooltipContainer = $(this.options.tooltipHtml),
          playlistOffset = this.playlist.offset();

      // add tooltip to the dom
      this.$element.append(tooltipContainer);

      // event handler for mouse hover over playlist
      this.playlistVideos.on({

        mouseenter: function(){

          var $this = $(this),
              videoSummary = $this.find('.featuredVideoSummary').text(), // text of video summary
              position = {
                top: $this.offset().top - playlistOffset.top // position tooltip to the top of the playlist item
              };

          // check that there's a description set for the video then display the tooltip
          if (videoSummary !== '') {
            tooltipContainer
              .text(videoSummary)
              .css('top', position.top)
              .show();
          }

        },

        mouseleave: function(){
          tooltipContainer.hide();
        }

      });

    },

    getPlaylistIds: function() {

      var arr = [];

      this.playlistVideos.each(function () {
        var videoId = $(this).data('videoId').toString();
        arr.push( videoId );
      });

      return arr;

    },

    getDuplicatePlaylistIds: function () {

      var ids = this.getPlaylistIds(),
          duplicates = [],
          collection = {},
          key;

      for (var i = 0, len = ids.length; i < len; i++) {

        key = ids[i].toString();

        if (typeof collection[key] === 'undefined') {
          collection[key] = true;
        } else {
          duplicates.push(key);
        }

      }

      return duplicates;

    },

    initializeHashLinking: function () {

      // bind to hash
      if ('onhashchange' in window) {

        var self = this;

        $(window).on('hashchange', function(e) {

           e.preventDefault();

          // @todo this kludge needs to be fixed
          if (self.playOnHashChange) {
            self.activeVideoId = self.getVideoIdFromUrl();
            self.playVideo('load', self.activeVideoId);
          }

          // set this back to true
          self.playOnHashChange = true;

        });

      }

    },

    getVideoIdFromUrl: function () {

      var videoId = this.getArgsFromUrl().videoId || this.getArgsFromUrl().bctid;

      if (typeof videoId === 'undefined') {
        videoId = null;
      }

      return videoId;

    },

    getArgsFromUrl: function (url) {

      // pass in a url or grab from current window
      url = url || window.location.href;

      var args = {},
          params = url.slice(url.indexOf('#') + 1).split('&');

      for (var i = 0, len = params.length; i < len; i++) {

        var param = params[i].split('=');

        if (param.length > 1) {
          args[param[0]] = param[1];
        } else {
          args[param[0]] = null;
        }

      }

      return args;

    }

  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function ( options ) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName,
          new Video( this, options ));
      }
    });
  };

}));