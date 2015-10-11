import React from 'react';
import ReactDOM from 'react-dom';
import xhr from 'xhr';

import parse from 'parse';

class Index extends React.Component {
  select(index=0, advance=true) {
    this.state.audio && this.state.audio.pause();

    let track = this.state.tracks[index];
    let audio = new Audio(track.location);
    let historyIndex = this.state.historyIndex;
    if (advance) {
      historyIndex++;
      this.state.history.splice(historyIndex, 0, index);
    }

    this.setState({
      audio,
      playing: false,
      disabled: true,
      index,
      historyIndex,
      history: this.state.history,
    }, function() {
      let offset = this.refs.controlBar.clientHeight;
      let scrollY = this.refs['track_' + index].getBoundingClientRect().top;
      window.scrollBy(0, scrollY - offset);

      // Update React's playing status when the audio fire these events
      audio.addEventListener('playing', () => this.setState({playing: true, disabled: false}));
      audio.addEventListener('pause', () => this.setState({playing: false}));
      audio.addEventListener('ended', () => {
        this.setState({playing: false}, () => {this.randomize()});
      });

      // If there was an error, remove the current index and randomize
      audio.addEventListener('error', () => {
        this.state.history.splice(historyIndex, 1)
        this.setState({
          historyIndex: historyIndex - 1,
          history: this.state.history,
        }, this.randomize, this);
      });
      audio.volume = 0.5;
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
    return () => {
      return this.select(index);
    }
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
      disabled: true,
    };
  }

  componentDidMount() {
    xhr({
      uri: 'http://aersia.nihey.org',
      useXDR: true,
    }, (err, resp, body) => {
      this.setState({tracks: parse(body)}, this.randomize);
    });
  }

  render() {
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
        <div className="volume"></div>
        <div className="progress">
          <span>00:00</span>
          <div className="progress-bar"></div>
        </div>
      </div>
      <ul className="tracks">
        {this.state.tracks.map(function(track, index) {
          return <li key={index} ref={`track_${index}`} className={this.state.index === index ? 'active' : ''}
                     onClick={this.onSelect(index)}>
            {track.creator} - {track.title}
          </li>
        }, this)}
      </ul>;
    </div>
  }
}

ReactDOM.render(<Index/>, document.getElementById('react-body'));
