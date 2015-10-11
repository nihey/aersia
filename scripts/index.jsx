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
      this.refs['track_' + index].scrollIntoView();
      audio.volume = 0.5;
      audio.play();
      audio.addEventListener('ended', () => this.randomize());
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
      this.select(index);
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
    return <ul className="tracks">
      {this.state.tracks.map(function(track, index) {
        return <li key={index} ref={`track_${index}`} className={this.state.index === index ? 'active' : ''}
                   onClick={this.onSelect(index)}>
          {track.creator} - {track.title}
        </li>
      }, this)}
    </ul>;
  }
}

ReactDOM.render(<Index/>, document.getElementById('react-body'));
