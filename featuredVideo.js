/*!
* Featured Video v0.0.1 (http://okize.github.com/)
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
    showPlaylist: true, // show a playlist alongside the video player
    showPlaylistTooltips: true, // show 'tooltips' of the video summary inside the playlist
    autoplayFirstVideo: true // play the first video automagically as soon as it's loaded
  };

  // plugin constructor
  var Video = function (element, options) {
    this.el = element;
    this.options = $.extend( {}, defaults, options) ;
    this.init();
  };

  Video.prototype = {

    init: function() {

      this.$element = $(this.el); // featured video component dom container
      this.player = this.$element.find('.featuredVideoPlayer'); // the video player dom element

      var brightcoveScript = {
        url: 'http://admin.brightcove.com/js/BrightcoveExperiences.js', // brightcove script to load aysnc
        isLoaded: $(document).data('brightcoveScriptLoaded') || false // check via data attr if the script has ben loaded yet
      };

      // initialize video player
      this.getPlayer(brightcoveScript);

      // event handler for when player has been loaded and is ready to use
      this.$element.on('videoPlayerLoaded', function () {

        console.log('video player is ready to be used');

      });

      // initialize playlist
      this.getPlaylist();

    },

    getPlayer: function (brightcoveScript) {

      // declare these vars in higher scope
      var bcPlayer, bcPlayerModule;

      // this funciton is run after loading of brightcove script
      var brightcoveScriptLoaded = function (foo) {
          console.log(foo);

        // get brightcove object
        var brightcove = window.brightcove || {};

        // all the data for player has been received by the browser
        // can now get references to the overall player and API modules
        window.bcPlayerLoaded = function (bcPlayerId) {
          bcPlayer = brightcove.api.getExperience(bcPlayerId);
          bcPlayerModule = bcPlayer.getModule(brightcove.api.modules.APIModules.VIDEO_PLAYER);
        };

        // the player has now been fully instantiated and
        // is ready to interact with via the API
        // only call methods of the API modules after the template ready event has fired
        window.bcPlayerReady = function () {


          // publish custom event
          foo.trigger('videoPlayerLoaded');

        };

        // no idea what this does, but if it's not here FF & IE9 won't work... go figure
        // brightcove.createExperiences();

      };

      // check to see if the script has been loaded yet
      if (!brightcoveScript.isLoaded) {

        // if not, load the Brightcove script async
        $.ajax({
          url: brightcoveScript.url,
          dataType: 'script',
          success: brightcoveScriptLoaded(this.$element)
        });

      }

      // save status of BC script
      $(document).data('brightcoveScriptLoaded', true);

    },

    getPlayerScript: function (url) {



    },

    getPlaylist: function () {

      // exit if playlist is disabled
      if (!this.options.showPlaylist) {
        console.log('no playlist');
        return;
      }

      // show the playlist
      // this.playlist.el.show();

    },

    parseHashArgs: function (url) {

      url = url || window.location.href;

      var vars = {},
          hashes = url.slice(url.indexOf('#') + 1).split('&');

      for (var i = 0; i < hashes.length; i++) {

        var hash = hashes[i].split('=');

        if (hash.length > 1) {
          vars[hash[0]] = hash[1];
        } else {
          vars[hash[0]] = null;
        }

      }

      return vars;

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