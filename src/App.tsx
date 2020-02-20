import React from 'react';
import './App.scss';
import { webgl } from './webgl/webgl';

export class App extends React.PureComponent {
	ele = React.createRef<HTMLCanvasElement>();

	componentDidMount() {
		const canvas = this.ele.current!;
		const gl = canvas.getContext('webgl');
		if (!gl) {
			alert('Unable to initialize WebGL. Your browser or machine may not support it.');
			return;
		}
		webgl(gl);
	}

	render() {
		return (
			<div >
				<canvas ref={this.ele}   >
				</canvas>
			</div>
		);
	}
}

export default App;
