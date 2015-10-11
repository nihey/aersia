import React from 'react';
import ReactDOM from 'react-dom';
import xhr from 'xhr';

import parse from 'parse';

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tracks: [],
    };
  }

  componentDidMount() {
    xhr({
      uri: 'http://aersia.nihey.org',
      useXDR: true,
    }, (err, resp, body) => {
      this.setState({tracks: parse(body)});
    });
  }

  render() {
    return <ul className="tracks">
      {this.state.tracks.map(function(track, index) {
        return <li key={index}>
          {track.creator} - {track.title}
        </li>
      })}
    </ul>;
  }
}

ReactDOM.render(<Index/>, document.getElementById('react-body'));
