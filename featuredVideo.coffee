###!
featuredVideo v1.1.4 (http://okize.github.com/)
Copyright (c) 2013 | Licensed under the MIT license
http://www.opensource.org/licenses/mit-license.php
###

((factory) ->

  # use AMD or browser globals to create a jQuery plugin.
  if typeof define is 'function' and define.amd
    define [ 'jquery' ], factory
  else
    factory jQuery

) ($) ->

  'use strict'

  pluginName = 'featuredVideo'

  # default plugin options
  defaults =
    autoplayFirstVideo: true # play the first video automagically as soon as it's loaded
    maintainState: true # supports appending videoId in url hash to link to any video in playlist
    showPlaylist: true # show a playlist alongside the video player
    showPlaylistTooltips: true # show 'tooltips' of the video summary inside the playlist
    tooltipHtml: '<div class="featuredVideoPlaylistTooltip"></div>' # html for dom element of tooltip

  class Video

    # plugin constructor
    constructor: (@element, options) ->

      @el = $(@element) # featured video component dom container
      @options = $.extend({}, defaults, options)
      @player = @el.find('.featuredplayer') # the video player dom element
      @playlist = @el.find('.featuredVideoPlaylist') # the playlist dom element
      @playlistVideos = @playlist.find('li') # each video item in the playlist
      @playlistVideosCount = @playlistVideos.length # count of videos in the playlist
      @playlistFirstVideoId = @playlistVideos.eq(0).data('videoId') or null # id of first video in playlist
      @playType = if @options.autoplayFirstVideo then 'load' else 'cue' # set the playType based on user option
      @stateKey = 'videoId' # string to use for the url hash state maintenance
      @activeVideoId = null # stores the video id of the video currently in the player
      @hashVideoId = @getIdFromUrl() # get video id from url hash
      @hashObject = null
      @init()

    # plugin initializer
    init: ->

      # sanity check
      @sanityCheck()

      # initialize video player
      @getPlayer()

      # initialize video playing from in-page links
      @watchHash()

    # checks to make sure a few critical pieces of information are being supplied
    # in the html before trying to render the video component
    sanityCheck: ->

      # make sure there is at least one video in the playlist
      if @playlistVideosCount <= 0
        @el.hide()
        return $.error('no videos in the playlist!')

      # make sure at least the first video has an id
      if (not @playlistFirstVideoId or @playlistFirstVideoId is '')
        @el.hide()
        return $.error('no video ids specified in playlist!')

      # make sure that there are no duplicate ids in playlist array
      duplicateIds = @getDuplicatePlaylistIds()
      if duplicateIds.length > 0 && typeof console == 'object'
        console.error('WARNING! duplicate ids found in the playlist: ', duplicateIds)

    # this will hold the api object that brightcove returns
    player: {}

    # loads video player script if it hasn't been loaded yet
    getPlayer: ->

      # script configuration
      playerScript =
        url: 'http://admin.brightcove.com/js/BrightcoveExperiences.js' # brightcove script to load aysnc
        isLoaded: $(document).data('playerScriptLoaded') or false # check via data attr if the script has been loaded yet

      # get the 3rd party script if it hasn't been loaded yet
      playerScriptIsLoaded = if (not playerScript.isLoaded) then @loadPlayerScript(playerScript.url) else @resolve()

      # load the player script async
      $.when(playerScriptIsLoaded).done(=>
        @initializePlayer()
      ).fail ->
        $.error 'Brightcove script failed to load'

    # loads 3rd party video player provider script
    loadPlayerScript: (url) ->

      # attempt to load 3rd party script and return promise
      playerScriptIsLoaded = $.ajax(url,
        dataType: 'script'
      )
      playerScriptIsLoaded

    # inits the player when it's ready
    initializePlayer: ->

      # brightcove object
      brightcove = window.brightcove or {}

      # all the data for player has been received by the browser
      # can now get references to the overall player and API modules
      window.brightcovePlayerLoaded = (brightcovePlayerId) =>
        brightcoveExp = brightcove.api.getExperience(brightcovePlayerId)
        @player = brightcoveExp.getModule(brightcove.api.modules.APIModules.VIDEO_PLAYER)

      # the player has now been fully instantiated and
      # is ready to interact with via the API
      # only call methods of the API modules after the template ready event has fired
      window.brightcovePlayerReady = =>

        # add video to player (3rd arg is an event object)
        @updateState(@getVideo(), @playType, undefined)

        # now can initialize the playlist to interact with the player
        @initializePlaylist()

      # no idea what this does, but if it's not here FF & IE9 won't work... go figure
      brightcove.createExperiences()

    # loads video into player by play type (load or cue)
    playVideo: (playType, videoId) ->

      if playType is 'load'
        @player.loadVideoByID(videoId)
      else if playType is 'cue'
        @player.cueVideoByID(videoId)

    # determines which video to play and sets the activeVideoId
    getVideo: (el) ->

      # if an element is passed in, grab the video id from it's data attr
      if typeof el isnt 'undefined'
        @activeVideoId = $(el).data('videoId')

      # check if there was a video id set in url hash
      # and check that videoid is a valid id inside the playlist
      else if @hashVideoId and @hasValidId(@hashVideoId)
        @activeVideoId = @hashVideoId

      # otherwise use the id of the first video in the playlist
      else
        @activeVideoId = @playlistFirstVideoId

      # return videoId
      @activeVideoId

    # check that the video id arg exists in the playlist
    hasValidId: (videoId) ->

      idList = @getPlaylistIds()

      # ie7/8 does not support array.indexOf
      i = 0
      len = idList.length

      while i < len
        return true if idList[i] is videoId
        i++
      false

    # 'selects' an item in the playlist
    selectPlaylistItem: ($el, eventType) ->

      # if no element parameter passed, try to select el based on data-attr
      if typeof $el is 'undefined'
        $el = @playlist.find('li[data-video-id=' + @activeVideoId + ']')

      # make sure the playlist item can be seen in the playlist overflow
      # if it's from a click in the playlist, do nothing because it's
      # annoying to have the item you just clicked on jump to the top
      @bringPlaylistItemIntoView($el.get(0)) if eventType isnt 'click'

      # remove active class from list
      @playlistVideos.removeClass('active')

      # apply class to active element
      $el.addClass('active')

    # this will bring the video into view inside the playlist
    bringPlaylistItemIntoView: (el) ->

      # if there's no el, just make it the first video
      return false if typeof el is 'undefined'

      # use scrollIntoViewIfNeeded if available, else fallback to scrollIntoView
      if el.scrollIntoViewIfNeeded
        el.scrollIntoViewIfNeeded(true)
      else
        el.scrollIntoView(true)

    # if playlist is not enabled, add a class to component, remove playlist
    # from dom and exit, otherwise initialize the playlist
    initializePlaylist: ->

      unless @options.showPlaylist
        @el.addClass 'noPlaylist'
        @playlist.remove()
        return

      # event handler for playlist clicks
      @playlist.on 'click', 'li', (e) =>
        e.preventDefault()
        @updateState(@getVideo(e.currentTarget), 'load', e)

      # if video tooltips are enabled, initialize them
      @initializePlaylistTooltips() if @options.showPlaylistTooltips

      # show the playlist
      @playlist.css('visibility', 'visible')

    # 'tooltips' that display summary of video
    initializePlaylistTooltips: ->

      # dom element that contains 'tooltip'
      tooltipContainer = $(@options.tooltipHtml)
      playlistOffset = @playlist.offset()

      # add tooltip to the dom
      @el.append tooltipContainer

      # event handler for mouse hover over playlist
      @playlistVideos.on

        mouseenter: ->
          $this = $(this)

          # text of video summary
          videoSummary = $this.find('.featuredVideoSummary').text()

          # position tooltip to the top of the playlist item
          position = top: $this.offset().top - playlistOffset.top

          # check that a description exists for the video before displaying the tooltip
          if videoSummary isnt ''
            tooltipContainer.text(videoSummary).css('top', position.top).show()

        mouseleave: ->
          tooltipContainer.hide()

    # returns array of video ids from the playlist
    getPlaylistIds: ->

      arr = []
      @playlistVideos.each ->
        videoId = $(this).data('videoId').toString()
        arr.push videoId
      arr

    # returns array of duplicate ids, if any
    getDuplicatePlaylistIds: ->

      ids = @getPlaylistIds()
      duplicates = []
      collection = {}
      key = undefined
      i = 0
      len = ids.length

      while i < len
        key = ids[i].toString()
        if typeof collection[key] is 'undefined'
          collection[key] = true
        else
          duplicates.push key
        i++
      duplicates

    # allows in-page links to update the video by passing video ids through hash in url
    watchHash: ->

      # bind to hash
      if 'onhashchange' of window
        $(window).on 'hashchange', (e) =>

          e.preventDefault()

          id = @getIdFromUrl()
          if id is undefined or id == @hashObject[@stateKey]
            return
          else
            @hashVideoId = @activeVideoId = id
            @updateState(@getVideo(), 'load', undefined)

    # checks if there's a hash for video player state maintenance
    # if there is, set activeVideo var to hash state
    getStateFromHash: ->

      @hashObject = @getHashObject()
      return null if !@hashObject
      state = @hashObject[@stateKey] ? null
      return null if !state
      @activeTab = @hashObject[@stateKey]

    # update url hash with current video id
    updateUrlHash: (videoId) ->

      window.location.hash = 'videoId=' + videoId if @options.maintainState


    # returns the hash from the current window or null
    getUrlHash: ->

      if window.location.hash then window.location.hash.substring(1) else null

    # returns object created from hash or null
    getHashObject: ->

      hash = @getUrlHash()
      return null if !hash
      args = {}
      arr = hash.split('&')
      for item in arr
        arg = item.split('=')
        if (arg.length > 1)
          args[arg[0]] = arg[1]
        else
          args[arg[0]] = undefined
      args

    # attempts to return a video id that was passed in the url
    getIdFromUrl: ->

      obj = @getHashObject()

      # if an object is returned set videoId to @stateKey in obj
      if obj?
        videoId = obj[@stateKey]

      # if there's no hash object, also check for videoId in query string
      else
        videoId = @getIdFromQueryString()

      # a hash object could be returned with no id
      if typeof videoId is 'undefined' or videoId is ''
        videoId = null

      videoId

    # edge-case where url may be loaded with a query string that contains a video id param
    # example: ?bcpid=2117382598001&bckey=AQ~~,AAAAAFGE4wo~,g57wOIK2TXKMBHTPnffWcp0t79yQC9T_&bctid=1897188942001
    # this function is a fallback that will return the video id from that string
    getIdFromQueryString: ->

      match = window.location.search.match(new RegExp('[?&]' + 'bctid' + '=([^&]+)(&|$)'))
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '))

    # converts the hash object into a string for the url hash
    buildHashObject: () ->

      $.param(@hashObject)

    # updates the cached hash object and then updates url
    updateHash: (id) ->

      # convert to string
      id += ''

      # get fresh hash obj in case another component has altered it
      @hashObject = @getHashObject()

      # if @hashObject is null, create it
      @hashObject = {} if !@hashObject

      # update hash
      @hashObject[@stateKey] = id
      @setUrlHash(@buildHashObject())

    # updates url hash with tab identifier
    setUrlHash: (hash) ->

      window.location.hash = hash

    # updates the state of the component
    updateState: (videoId, playType, e) ->

      @activeVideoId = videoId

      # update url hash
      if @options.maintainState
        @updateHash(@activeVideoId)

      # play the selected video
      @playVideo(playType, videoId)

      # if showing a playlist, 'select' the correct video in the list
      if @options.showPlaylist
        item = if e and e.currentTarget then $(e.currentTarget) else undefined
        eventType = if e and e.type then e.type else 'none'
        @selectPlaylistItem(item, eventType)

  # lightweight wrapper around the constructor that prevents multiple instantiations
  $.fn[pluginName] = (options) ->
    @each ->
      if !$.data(@, 'plugin_#{pluginName}')
        $.data(@, 'plugin_#{pluginName}', new Video(@, options))
      return
  return