import React from 'react';
import ReactDOM from 'react-dom';
import xhr from 'xhr';

import parse from 'parse';

class Index extends React.Component {
  select(index=0) {
    this.state.audio && this.state.audio.pause();

    let track = this.state.tracks[index];
    let audio = new Audio(track.location);
    this.setState({audio, index}, function() {
      let offset = this.refs.controlBar.clientHeight;
      let scrollY = this.refs['track_' + index].getBoundingClientRect().top;
      window.scrollBy(0, scrollY - offset);

      audio.addEventListener('ended', () => this.randomize());
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

  /*
   * React
   */

  constructor(props) {
    super(props);
    this.state = {
      tracks: [],
      audio: null,
      index: null,
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
        <button className="square"><i className="fa fa-play"/></button>
        <button className="square"><i className="fa fa-step-backward"/></button>
        <button className="square"><i className="fa fa-step-forward"/></button>
        <button className="square"><i className="fa fa-random"/></button>
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
