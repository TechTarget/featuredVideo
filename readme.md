Featured Video microsite component

Brightcove documentation:
  http://support.brightcove.com/en/video-cloud/docs/using-smart-player-api

Need to set this in Brightcove control panel:
  videocloud manager > player settings > web settings > enable actionscript/javascript apis

  testGetArgsFromUrl: function () {

    console.log('test started...');

    var ids = [1982178965001, 1897188942001, 1871056203001, 1871107119001, 1834784326001, 1832858263001, 1832858253001, 1828362629001, 1785579854001, 1785590334001, 1785136996001, 1768317771001, 1766325439001, 1745733539001, 1730775741001, 1727315889001, 1711303860001, 1697332157001, 1677122305001, 1643143173001, 1643104443001, 1643120878001, 1643104441001, 1643120880001];

    var urls = [
      'http://localhost/featuredVideo/example/index.html#videoId=1982178965001',
      'http://localhost/featuredVideo/example/index.html?bcpid=2117382598001&bckey=AQ~~,AAAAAFGE4wo~,g57wOIK2TXKMBHTPnffWcp0t79yQC9T_&bctid=1897188942001',
      'http://localhost/featuredVideo/example/index.html?bcpid=2117382598001&bctid=1871056203001',
      'http://localhost/featuredVideo/example/index.html?bctid=1871056203001',
      'http://localhost/featuredVideo/example/index.html#bctid=1871107119001',
      'http://localhost/featuredVideo/example/index.html?bcpid=2117382598001&bckey=AQ~~,AAAAAFGE4wo~,g57wOIK2TXKMBHTPnffWcp0t79yQC9T_&bctid=1897188942001#videoId=1832858263001'
    ];

    var test, result;
    for (var i = 0, len = urls.length; i < len; i++) {
      test = this.getArgsFromUrl(urls[i]).videoId || this.getArgsFromUrl(urls[i]).bctid;
      result = (typeof test !== 'undefined' && test === ids[i].toString()) ? 'pass' : 'fail';
      console.log('test #' + (i+1) + ' -> ' +  result);
    }

    console.log('test complete!');

  },