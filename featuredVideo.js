/*!
featuredVideo v1.1.4 (http://okize.github.com/)
Copyright (c) 2013 | Licensed under the MIT license
http://www.opensource.org/licenses/mit-license.php
*/


(function() {
  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery'], factory);
    } else {
      return factory(jQuery);
    }
  })(function($) {
    'use strict';
    var Video, defaults, pluginName;

    pluginName = 'featuredVideo';
    defaults = {
      autoplayFirstVideo: true,
      maintainState: true,
      showPlaylist: true,
      showPlaylistTooltips: true,
      tooltipHtml: '<div class="featuredVideoPlaylistTooltip"></div>'
    };
    Video = (function() {
      function Video(element, options) {
        this.element = element;
        this.el = $(this.element);
        this.options = $.extend({}, defaults, options);
        this.player = this.el.find('.featuredplayer');
        this.playlist = this.el.find('.featuredVideoPlaylist');
        this.playlistVideos = this.playlist.find('li');
        this.playlistVideosCount = this.playlistVideos.length;
        this.playlistFirstVideoId = this.playlistVideos.eq(0).data('videoId') || null;
        this.playType = this.options.autoplayFirstVideo ? 'load' : 'cue';
        this.stateKey = 'videoId';
        this.activeVideoId = null;
        this.hashVideoId = this.getIdFromUrl();
        this.hashObject = null;
        this.init();
      }

      Video.prototype.init = function() {
        this.sanityCheck();
        this.getPlayer();
        return this.watchHash();
      };

      Video.prototype.sanityCheck = function() {
        var duplicateIds;

        if (this.playlistVideosCount <= 0) {
          this.el.hide();
          return $.error('no videos in the playlist!');
        }
        if (!this.playlistFirstVideoId || this.playlistFirstVideoId === '') {
          this.el.hide();
          return $.error('no video ids specified in playlist!');
        }
        duplicateIds = this.getDuplicatePlaylistIds();
        if (duplicateIds.length > 0 && typeof console === 'object') {
          return console.error('WARNING! duplicate ids found in the playlist: ', duplicateIds);
        }
      };

      Video.prototype.player = {};

      Video.prototype.getPlayer = function() {
        var playerScript, playerScriptIsLoaded,
          _this = this;

        playerScript = {
          url: 'http://admin.brightcove.com/js/BrightcoveExperiences.js',
          isLoaded: $(document).data('playerScriptLoaded') || false
        };
        playerScriptIsLoaded = !playerScript.isLoaded ? this.loadPlayerScript(playerScript.url) : this.resolve();
        return $.when(playerScriptIsLoaded).done(function() {
          return _this.initializePlayer();
        }).fail(function() {
          return $.error('Brightcove script failed to load');
        });
      };

      Video.prototype.loadPlayerScript = function(url) {
        var playerScriptIsLoaded;

        playerScriptIsLoaded = $.ajax(url, {
          dataType: 'script'
        });
        return playerScriptIsLoaded;
      };

      Video.prototype.initializePlayer = function() {
        var brightcove,
          _this = this;

        brightcove = window.brightcove || {};
        window.brightcovePlayerLoaded = function(brightcovePlayerId) {
          var brightcoveExp;

          brightcoveExp = brightcove.api.getExperience(brightcovePlayerId);
          return _this.player = brightcoveExp.getModule(brightcove.api.modules.APIModules.VIDEO_PLAYER);
        };
        window.brightcovePlayerReady = function() {
          _this.updateState(_this.getVideo(), _this.playType, void 0);
          return _this.initializePlaylist();
        };
        return brightcove.createExperiences();
      };

      Video.prototype.playVideo = function(playType, videoId) {
        if (playType === 'load') {
          return this.player.loadVideoByID(videoId);
        } else if (playType === 'cue') {
          return this.player.cueVideoByID(videoId);
        }
      };

      Video.prototype.getVideo = function(el) {
        if (typeof el !== 'undefined') {
          this.activeVideoId = $(el).data('videoId');
        } else if (this.hashVideoId && this.hasValidId(this.hashVideoId)) {
          this.activeVideoId = this.hashVideoId;
        } else {
          this.activeVideoId = this.playlistFirstVideoId;
        }
        return this.activeVideoId;
      };

      Video.prototype.hasValidId = function(videoId) {
        var i, idList, len;

        idList = this.getPlaylistIds();
        i = 0;
        len = idList.length;
        while (i < len) {
          if (idList[i] === videoId) {
            return true;
          }
          i++;
        }
        return false;
      };

      Video.prototype.selectPlaylistItem = function($el, eventType) {
        if (typeof $el === 'undefined') {
          $el = this.playlist.find('li[data-video-id=' + this.activeVideoId + ']');
        }
        if (eventType !== 'click') {
          this.bringPlaylistItemIntoView($el.get(0));
        }
        this.playlistVideos.removeClass('active');
        return $el.addClass('active');
      };

      Video.prototype.bringPlaylistItemIntoView = function(el) {
        if (typeof el === 'undefined') {
          return false;
        }
        if (el.scrollIntoViewIfNeeded) {
          return el.scrollIntoViewIfNeeded(true);
        } else {
          return el.scrollIntoView(true);
        }
      };

      Video.prototype.initializePlaylist = function() {
        var _this = this;

        if (!this.options.showPlaylist) {
          this.el.addClass('noPlaylist');
          this.playlist.remove();
          return;
        }
        this.playlist.on('click', 'li', function(e) {
          e.preventDefault();
          return _this.updateState(_this.getVideo(e.currentTarget), 'load', e);
        });
        if (this.options.showPlaylistTooltips) {
          this.initializePlaylistTooltips();
        }
        return this.playlist.css('visibility', 'visible');
      };

      Video.prototype.initializePlaylistTooltips = function() {
        var playlistOffset, tooltipContainer;

        tooltipContainer = $(this.options.tooltipHtml);
        playlistOffset = this.playlist.offset();
        this.el.append(tooltipContainer);
        return this.playlistVideos.on({
          mouseenter: function() {
            var $this, position, videoSummary;

            $this = $(this);
            videoSummary = $this.find('.featuredVideoSummary').text();
            position = {
              top: $this.offset().top - playlistOffset.top
            };
            if (videoSummary !== '') {
              return tooltipContainer.text(videoSummary).css('top', position.top).show();
            }
          },
          mouseleave: function() {
            return tooltipContainer.hide();
          }
        });
      };

      Video.prototype.getPlaylistIds = function() {
        var arr;

        arr = [];
        this.playlistVideos.each(function() {
          var videoId;

          videoId = $(this).data('videoId').toString();
          return arr.push(videoId);
        });
        return arr;
      };

      Video.prototype.getDuplicatePlaylistIds = function() {
        var collection, duplicates, i, ids, key, len;

        ids = this.getPlaylistIds();
        duplicates = [];
        collection = {};
        key = void 0;
        i = 0;
        len = ids.length;
        while (i < len) {
          key = ids[i].toString();
          if (typeof collection[key] === 'undefined') {
            collection[key] = true;
          } else {
            duplicates.push(key);
          }
          i++;
        }
        return duplicates;
      };

      Video.prototype.watchHash = function() {
        var _this = this;

        if ('onhashchange' in window) {
          return $(window).on('hashchange', function(e) {
            var id;

            e.preventDefault();
            id = _this.getIdFromUrl();
            if (id === void 0 || id === _this.hashObject[_this.stateKey]) {

            } else {
              _this.hashVideoId = _this.activeVideoId = id;
              return _this.updateState(_this.getVideo(), 'load', void 0);
            }
          });
        }
      };

      Video.prototype.getStateFromHash = function() {
        var state, _ref;

        this.hashObject = this.getHashObject();
        if (!this.hashObject) {
          return null;
        }
        state = (_ref = this.hashObject[this.stateKey]) != null ? _ref : null;
        if (!state) {
          return null;
        }
        return this.activeTab = this.hashObject[this.stateKey];
      };

      Video.prototype.updateUrlHash = function(videoId) {
        if (this.options.maintainState) {
          return window.location.hash = 'videoId=' + videoId;
        }
      };

      Video.prototype.getUrlHash = function() {
        if (window.location.hash) {
          return window.location.hash.substring(1);
        } else {
          return null;
        }
      };

      Video.prototype.getHashObject = function() {
        var arg, args, arr, hash, item, _i, _len;

        hash = this.getUrlHash();
        if (!hash) {
          return null;
        }
        args = {};
        arr = hash.split('&');
        for (_i = 0, _len = arr.length; _i < _len; _i++) {
          item = arr[_i];
          arg = item.split('=');
          if (arg.length > 1) {
            args[arg[0]] = arg[1];
          } else {
            args[arg[0]] = void 0;
          }
        }
        return args;
      };

      Video.prototype.getIdFromUrl = function() {
        var obj, videoId;

        obj = this.getHashObject();
        if (obj != null) {
          videoId = obj[this.stateKey];
        } else {
          videoId = this.getIdFromQueryString();
        }
        if (typeof videoId === 'undefined' || videoId === '') {
          videoId = null;
        }
        return videoId;
      };

      Video.prototype.getIdFromQueryString = function() {
        var match;

        match = window.location.search.match(new RegExp('[?&]' + 'bctid' + '=([^&]+)(&|$)'));
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
      };

      Video.prototype.buildHashObject = function() {
        return $.param(this.hashObject);
      };

      Video.prototype.updateHash = function(id) {
        id += '';
        this.hashObject = this.getHashObject();
        if (!this.hashObject) {
          this.hashObject = {};
        }
        this.hashObject[this.stateKey] = id;
        return this.setUrlHash(this.buildHashObject());
      };

      Video.prototype.setUrlHash = function(hash) {
        return window.location.hash = hash;
      };

      Video.prototype.updateState = function(videoId, playType, e) {
        var eventType, item;

        this.activeVideoId = videoId;
        if (this.options.maintainState) {
          this.updateHash(this.activeVideoId);
        }
        this.playVideo(playType, videoId);
        if (this.options.showPlaylist) {
          item = e && e.currentTarget ? $(e.currentTarget) : void 0;
          eventType = e && e.type ? e.type : 'none';
          return this.selectPlaylistItem(item, eventType);
        }
      };

      return Video;

    })();
    $.fn[pluginName] = function(options) {
      return this.each(function() {
        if (!$.data(this, 'plugin_#{pluginName}')) {
          $.data(this, 'plugin_#{pluginName}', new Video(this, options));
        }
      });
    };
  });

}).call(this);
