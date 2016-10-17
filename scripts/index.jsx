import React from 'react';
import ReactDOM from 'react-dom';
import xhr from 'xhr';
import scroll from 'scroll';

import parse from 'parse';

let pad = function(number) {
  number = (number && parseInt(number).toString()) || '0';
  return number.length === 1 ? '0' + number : number;
};

class Index extends React.Component {
  on(audio, event, callback) {
    this['__eventListener_' + event] = callback;
    audio.addEventListener(event, this['__eventListener_' + event]);
  }

  off(audio, event) {
    audio.removeEventListener(event, this['__eventListener_' + event]);
  }

  select(index=0, advance=true) {
    // Cleanup all event listeners
    Object.keys(this).forEach(function(key) {
      if (key.search(/^__eventListener_/) !== -1) {
        this.off(this.state.audio, key);
      }
    }, this);

    let audio = this.state.audio;
    // If there is no audio or the current audio is paused, play immediately
    if (!audio || audio.paused) {
      return this.play(index, advance);
    }

    // Otherwise, pause the song, and only start playing another one once the
    // current one has paused
    this.on(audio, 'pause', () => this.play(index, advance));
    audio && audio.pause();
  }

  scroll(top) {
    scroll.top(document.body, top, {
      duration: 400,
      ease: 'outQuart',
    });
    scroll.top(document.getElementsByTagName('html')[0], top, {
      duration: 400,
      ease: 'outQuart',
    });
  }

  play(index=0, advance=true) {
    let track = this.state.tracks[index];
    let audio = new Audio(track.location);
    let historyIndex = this.state.historyIndex;
    if (advance) {
      historyIndex++;
      this.state.history.splice(historyIndex, 0, index);
    }

    let identifier = encodeURIComponent(`${track.creator} - ${track.title}`);
    location.hash = `#!/${identifier}`;

    this.setState({
      audio,
      playing: false,
      disabled: true,
      index,
      historyIndex,
      history: this.state.history,
      time: 0,
      loading: 0,
    }, function() {
      let offset = this.refs.controlBar.clientHeight;
      let scrollY = this.refs['track_' + index].offsetTop;
      this.scroll(scrollY - offset);

      // Progress bar updating (for loading and playing)
      this.on(audio, 'progress', () => {
        if (!audio.buffered.length) {
          return;
        }
        // TODO Generalize this loading bar to skipped tracks
        this.state.loading = (audio.buffered.end(0) / audio.duration) * 100;
      });
      this.on(audio, 'timeupdate', () => {
        this.setState({time: audio.currentTime});
      });

      // Update React's playing status when the audio fire these events
      this.on(audio, 'playing', () => {
        this.setState({playing: true, disabled: false});
      });
      this.on(audio, 'pause', () => this.setState({playing: false}));
      this.on(audio, 'ended', () => {
        this.setState({playing: false}, () => {this.randomize()});
      });

      // If there was an error, remove the current index and randomize
      this.on(audio, 'error', () => {
        this.state.history.splice(historyIndex, 1)
        this.setState({
          historyIndex: historyIndex - 1,
          history: this.state.history,
        }, this.randomize, this);
      });
      audio.volume = this.state.volume;
      audio.play();
    }, this);
  }

  randomize() {
    let tracks = this.state.tracks;
    this.select(Math.floor(tracks.length * Math.random()));
  }

  /*
   * Event Listeners
   */

  onSelect(index) {
    return (event) => {
      // In this case, the user just asked for the download keep playing
      let tagName = event.target.tagName;
      if (tagName === 'I') {
        return;
      }

      return this.select(index);
    }
  }

  onSeek(event) {
    if (this.state.disabled) {
      return;
    }

    // Find the percentage that the click represents to the music
    let rect = this.refs.progressBar.getBoundingClientRect();
    let percentage = (event.pageX - rect.left) / rect.width;
    this.state.audio.currentTime = this.state.audio.duration * percentage;
  }

  onVolume(event) {
    if (this.state.disabled) {
      return;
    }

    // Find the percentage that the click represents to the music
    let rect = this.refs.volumeBar.getBoundingClientRect();
    let percentage = (event.pageX - rect.left) / rect.width;
    this.setState({volume: percentage}, () => {
      if (this.state.audio) {
        this.state.audio.volume = percentage;
      }
    });
  }

  onStep(offset) {
    return () => {
      // Don't allow any negative index
      let index = this.state.historyIndex + offset;
      index = index < 0 ? 0 : index;

      // If no track was found on the given index randomize
      let track = this.state.history[index];
      if (track === undefined) {
        this.randomize();
        return;
      }

      // If a track was found, select it
      this.setState({historyIndex: index, disabled: true}, function() {
        this.select(track, false);
      }, this);
    }
  }

  togglePlay() {
    let playing = this.state.playing;
    playing && this.state.audio.pause();
    playing || this.state.audio.play();
  }

  /*
   * React
   */

  constructor(props) {
    super(props);
    this.state = {
      tracks: [],
      history: [],
      audio: null,
      index: null,
      historyIndex: -1,
      loading: 0,
      disabled: true,
      volume: 0.5,
    };
  }

  componentDidMount() {
    xhr({
      uri: 'https://aersia.nihey.org/roster.xml',
      useXDR: true,
    }, (err, resp, body) => {
      this.setState({tracks: parse(body)}, () => {
        // No pre-defined song, randomize
        if (!location.hash.substr(3)) {
          return this.randomize();
        }

        let identifier = decodeURIComponent(location.hash.substr(3));
        let foundIndex = 0;
        let found = this.state.tracks.some(function(track, index) {
          foundIndex = index;
          return `${track.creator} - ${track.title}` === identifier;
        });

        // Pre-defined song was not found, randomize
        if (!found) {
          return this.randomize();
        }

        // Pre-defined song found, play it
        this.select(foundIndex);
      });
    });
  }

  render() {
    let minutes = Math.floor(this.state.time / 60);
    let seconds = this.state.time % 60;

    let [remainingMinutes, remainingSeconds] = [0, 0];

    let percentage = 0;
    if (this.state.audio) {
      percentage = ((this.state.time / this.state.audio.duration) || 0) * 100;
      let delta = this.state.audio.duration - this.state.time;
      remainingMinutes = Math.floor(delta / 60);
      remainingSeconds = delta % 60;
    }
    return <div>
      <div className="control-bar" ref="controlBar">
        <button className="square" onClick={this.togglePlay.bind(this)} disabled={this.state.disabled}>
          <i className={'fa ' + (this.state.playing ? 'fa-pause' : 'fa-play')}/>
        </button>
        <button className="square" onClick={this.onStep(-1)} disabled={this.state.disabled}>
          <i className="fa fa-step-backward"/>
        </button>
        <button className="square" onClick={this.onStep(1)} disabled={this.state.disabled}>
          <i className="fa fa-step-forward"/>
        </button>
        <button className="square" onClick={this.randomize.bind(this)} disabled={this.state.disabled}>
          <i className="fa fa-random"/>
        </button>
        <div className="volume">
          <i className="fa fa-volume-off"/>
          <div className="volume-control" ref="volumeBar" onClick={this.onVolume.bind(this)}>
            <div className="volume-bar" style={{width: (this.state.volume * 100) + '%'}}></div>
          </div>
        </div>
        <div className="progress">
          <span className="clock">{pad(minutes)}:{pad(seconds)}</span>
          <div className="progress-bar" ref="progressBar" onClick={this.onSeek.bind(this)}>
            <div className="bar loading-bar" style={{right: (100 - this.state.loading) + '%'}}></div>
            <div className="bar track-bar" style={{right: (100 - percentage) + '%'}}></div>
            <div className="marker" style={{marginLeft: percentage.toFixed(2) + '%'}}></div>
          </div>
          <span className="percentage">{pad(remainingMinutes)}:{pad(remainingSeconds)}</span>
        </div>
      </div>
      <ul className="tracks">
        {this.state.tracks.map(function(track, index) {
          return <li key={index} ref={`track_${index}`} className={this.state.index === index ? 'active' : ''}
                     onClick={this.onSelect(index)}>
            {track.creator} - {track.title}
            <a href={track.location} download={`${track.creator} - ${track.title}`}>
              <i className="fa fa-download"/>
            </a>
          </li>
        }, this)}
      </ul>
      <div className="acknowledgement">
        developed by <a href="http://nihey.github.io" target="_blank">Nihey</a> /
        playlist by <a href="https://twitter.com/nekotendo" target="_blank">Cats777</a> /
        source code on <a href="https://github.com/nihey/aersia" target="_blank"><i className="fa fa-github"/></a>
      </div>
    </div>;
  }
}

ReactDOM.render(<Index/>, document.getElementById('react-body'));
