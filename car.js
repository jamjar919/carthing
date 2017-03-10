// Vertex shader program
var VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'attribute vec4 a_Normal;\n' +        // Normal
	'uniform mat4 u_ModelMatrix;\n' +
	'uniform mat4 u_NormalMatrix;\n' +
	'uniform mat4 u_ViewMatrix;\n' +
	'uniform mat4 u_ProjMatrix;\n' +
	'uniform vec3 u_LightColor;\n' +     // Light color
	'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
	'uniform vec3 u_LightPosition;\n' +
	'uniform vec3 u_AmbientLight;\n' + 
	'varying vec3 v_Normal;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec3 v_Position;\n' +
	'uniform bool u_isDirectionalLighting;\n' +
	'uniform bool u_isPointLighting;\n' +
	'void main() {\n' +
	'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
	'  if(u_isDirectionalLighting)\n' + 
	'  {\n' +
	'     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
	'     float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
	'     vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
	'     v_Color = vec4(diffuse, a_Color.a);\n' +
	'  }\n' +
	'  else if(u_isPointLighting) \n' +
	'  { \n' +
	'    v_Position = vec3(u_ModelMatrix * a_Position);\n' +
	'    v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'    v_Color = a_Color;\n' +
	// This code does vertex point lighting but is no longer needed
	// '    vec4 vertexPosition = u_ModelMatrix * a_Position;\n' +
	// '    vec3 lightDirection = normalize(u_LightPosition- vec3(vertexPosition));\n' +
	// '    v_Normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
	// '    float nDotL = max(dot( lightDirection, v_Normal), 0.0); \n' +
	// '    vec3 diffuse = u_LightColor * a_Color.rgb * nDotL; \n' +
	// '    vec3 ambient = u_AmbientLight * a_Color.rgb; \n' +
	// '    v_Color = vec4(diffuse + ambient, a_Color.a); \n' +
	'  } else \n' +
	'  {\n' +
	'     v_Color = a_Color;\n' +
	'  }\n' + 
	'}\n';

// Fragment shader program
var FSHADER_SOURCE =
	'#ifdef GL_ES\n' +
	'precision highp float;\n' +
	'#endif\n' +
	//'varying vec3 v_Normal;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec3 v_Normal;\n' +
	'varying vec3 v_Position;\n' +
	'uniform vec3 u_LightPosition;\n' +
	'uniform vec3 u_AmbientLight;\n' + 
	'uniform bool u_isPointLighting;\n' +
	'uniform vec3 u_LightColor;\n' + 
	'void main() {\n' +
	'  if (u_isPointLighting) { \n' +
	'    vec3 normal = normalize(v_Normal);\n' +
	'    vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
	'    float nDotL = max(dot( lightDirection, normal), 0.0);\n' +
	'    vec3 diffuse = u_LightColor * v_Color.rgb * nDotL;\n' +
	'    vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
	'    gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
	'  } else { \n'+
	'    gl_FragColor = v_Color;\n'+
	'  }\n'+
	'}\n';


var modelMatrix = new Matrix4(); // The model matrix
var viewMatrix = new Matrix4();  // The view matrix
var projMatrix = new Matrix4();  // The projection matrix
var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

var ANGLE_STEP = 3;  // The increments of rotation angle (degrees)
var g_yAngle = 0.0;    // The rotation y angle (degrees)
var g_wheelAngle = 0.0;
var g_doorOpen = false;
var g_carXPos = 0;
var g_carZPos = 0;
var g_carPosChange = 0.005;
var g_carVelocity = 0;
var g_carVelocityDecrease = 0.004;
var g_keysPressed = {};
var g_planeSize = 50;
var g_lightingMode = 0;
var g_lightingModes = ["DIRECTIONAL", "POINT", "POINT-FOLLOW", "NONE"]
var g_lightFollowsCar = false;
var g_cameraMode = 0;
var g_cameraModes = ["STATIC","FOLLOW","THIRDPERSON","FIRSTPERSON"]

function main() {
	// Do our setup for gl var
	var c = document.getElementById('scene');
	var gl = getWebGLContext(c);
	if (!gl) {console.log('Failed to get the rendering context for WebGL');return;}
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {console.log('Failed to intialize shaders.');return;}
	// Clear buffers
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	// Load up u vars
	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
	var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
	var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
	var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
	var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
	var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
	var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
	// Trigger type of lighting
	var u_isDirectionalLighting = gl.getUniformLocation(gl.program, 'u_isDirectionalLighting'); 
	var u_isPointLighting = gl.getUniformLocation(gl.program, 'u_isPointLighting'); 
	// Lighting constants
	gl.uniform3f(u_LightPosition, 0, 10, 0);
	gl.uniform3f(u_AmbientLight, 0.1, 0.1, 0.1);
	gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
	var lightDirection = new Vector3([0.5, 3.0, 4.0]);
	lightDirection.normalize();
	gl.uniform3fv(u_LightDirection, lightDirection.elements);
	// Check we loaded everything
	if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_ProjMatrix || !u_LightColor || !u_LightDirection || !u_isDirectionalLighting || !u_isPointLighting ) {
	console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');return;}
	// Calculate view matrix
	updateView(gl);
	projMatrix.setPerspective(30, c.width/c.height, 1, 1500);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

	// Key handlers
	document.onkeydown = function(ev){
		g_keysPressed[ev.keyCode] = true;
		// Toggle keys go here...
		switch(ev.keyCode) {
			case 32: // Spacebar 
				g_doorOpen = !g_doorOpen;
				break;
			case 67: // "c" 
				if (g_cameraMode < g_cameraModes.length-1) {
					g_cameraMode += 1;
				} else {
					g_cameraMode = 0;
				}
				break;
			case 76: // "l"
				if (g_lightingMode < g_lightingModes.length-1) {
					g_lightingMode += 1;
				} else {
					g_lightingMode = 0;
				}
				break;
		}
	};

	document.onkeyup = function(ev){
		g_keysPressed[ev.keyCode] = false;
	};
	// Init our loop to render the scene
	draw(gl, u_ModelMatrix, u_NormalMatrix, u_isDirectionalLighting, u_isPointLighting);
	setInterval(function() {
		tick(gl, u_ModelMatrix, u_NormalMatrix, u_isDirectionalLighting, u_isPointLighting);
	}, 5)
}

/**
* Helper function to set light pos
**/
function setLightPos(gl,x,y,z) {
	var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
	gl.uniform3f(u_LightPosition, x, y, z);
}

// Set camera position according to global variable
function updateView(gl) {
	var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
	switch (g_cameraMode) {
		case 0: // Static
			viewMatrix.setLookAt(0, 50, 100, 0, 0, 0, 0, 1, -10);
			break;
		case 1: // Follow
			viewMatrix.setLookAt(g_carXPos, 25, 50, g_carXPos, 0, g_carZPos, 0, 1, -10);
			break
		case 2: // Third person
			viewMatrix.setLookAt(g_carXPos+15*Math.sin(degToRadian(g_yAngle+90)), 5, g_carZPos+15*Math.cos(degToRadian(g_yAngle+90)),
				g_carXPos, 2, g_carZPos,
				Math.sin(degToRadian(g_yAngle+90)), 1, Math.cos(degToRadian(g_yAngle+90)));
			break;
		case 3: // First person
			viewMatrix.setLookAt(g_carXPos-1*Math.sin(degToRadian(g_yAngle+90)), 1, g_carZPos-1*Math.cos(degToRadian(g_yAngle+90)),
				g_carXPos-15*Math.sin(degToRadian(g_yAngle+90)), -2, g_carZPos-15*Math.cos(degToRadian(g_yAngle+90)),
				Math.sin(degToRadian(g_yAngle+90)), 1, Math.cos(degToRadian(g_yAngle+90))
			);
		default:
			// UUUUUH WHAT DO
			break;
	}
	gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
}

function degToRadian(deg) {
	return deg * Math.PI / 180;
}

function writeOut(message) {
	document.getElementById("out").innerHTML = "<p>"+message+"</p>" + document.getElementById("out").innerHTML;
}

function writeInfo() {
	s = "<p>Camera mode = "+g_cameraModes[g_cameraMode]+"</p>"+
	"<p>Lighting mode = "+g_lightingModes[g_lightingMode]+"</p>";
	document.getElementById("info").innerHTML = s;
}

/**
* Main render function
**/
function tick(gl, u_ModelMatrix, u_NormalMatrix, u_isDirectionalLighting, u_isPointLighting) {
	for (var keycode in g_keysPressed) {
		if (g_keysPressed[keycode]) {
			keydown(keycode);
		}
	}
	if (g_carVelocity > 0) {
		g_carVelocity -= g_carVelocityDecrease;
	} else if (g_carVelocity < 0) {
		g_carVelocity += g_carVelocityDecrease;
	}
	g_wheelAngle -= g_carVelocity*100;
	// Check we don't go out of bounds
	if (
		(g_carXPos + g_carVelocity*Math.sin(degToRadian(g_yAngle+90)) < g_planeSize/2) &&
		(g_carXPos + g_carVelocity*Math.sin(degToRadian(g_yAngle+90)) > -g_planeSize/2)
	){
		g_carXPos += g_carVelocity*Math.sin(degToRadian(g_yAngle+90));
	}
	if (
		(g_carZPos + g_carVelocity*Math.cos(degToRadian(g_yAngle+90)) < g_planeSize/2) &&
		(g_carZPos + g_carVelocity*Math.cos(degToRadian(g_yAngle+90)) > -g_planeSize/2)
	) {
		g_carZPos += g_carVelocity*Math.cos(degToRadian(g_yAngle+90));
	}
	writeInfo();
	draw(gl, u_ModelMatrix, u_NormalMatrix, u_isDirectionalLighting, u_isPointLighting);
}

function keydown(keycode) {
	switch (parseInt(keycode)) {
		case 40: // down 
			g_carVelocity += g_carPosChange;
			break;
		case 38: // up 
			g_carVelocity -= g_carPosChange;
			break;
		case 39: // Right 
			g_yAngle = (g_yAngle - ANGLE_STEP) % 360;
		  break;
		case 37: // Left 
			g_yAngle = (g_yAngle + ANGLE_STEP) % 360;
			break;
		default: return; // Skip drawing at no effective action
	}
}

/**
* One time function to write buffers 
**/
function initVertexBuffers(gl) {
	var vertices = new Float32Array([   // Coordinates
	 0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
	 0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
	 0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
	-0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
	-0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
	 0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
	]);


	var normals = new Float32Array([    // Normal
		0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
		1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
		0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
		-1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
		0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
		0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
	]);

	var indices = new Uint8Array([
		0, 1, 2,   0, 2, 3,    // front
		4, 5, 6,   4, 6, 7,    // right
		8, 9,10,   8,10,11,    // up
		12,13,14,  12,14,15,    // left
		16,17,18,  16,18,19,    // down
		20,21,22,  20,22,23     // back
	]);

	writeColorBuffer(gl, "RED");
	if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
	if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

	// Write the indices to the buffer object
	var indexBuffer = gl.createBuffer();
	if (!indexBuffer) {
		console.log('Failed to create the buffer object');
		return false;
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return indices.length;
}

/**
* Function to write just the color buffer
**/
function writeColorBuffer(gl, color) {
	switch(color) {
		case "RED":
			var colors = new Float32Array([    // Colors
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
			]);
			break;
		case "BLUE":
			var colors = new Float32Array([    // Colors
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v1-v2-v3 front
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v3-v4-v5 right
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v5-v6-v1 up
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v1-v6-v7-v2 left
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v7-v4-v3-v2 down
				0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1　    // v4-v7-v6-v5 back
			]);
			break;
		case "GREEN":
			var colors = new Float32Array([    // Colors
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v1-v2-v3 front
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v3-v4-v5 right
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v5-v6-v1 up
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v1-v6-v7-v2 left
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v7-v4-v3-v2 down
				0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0　    // v4-v7-v6-v5 back
			]);
			break;
		case "DARKRED":
			var colors = new Float32Array([    // Colors
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0,     // v0-v0.5-v2-v3 front
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0,     // v0-v3-v4-v5 right
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0,     // v0-v5-v6-v0.5 up
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0,     // v0.5-v6-v7-v2 left
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0,     // v7-v4-v3-v2 down
				0.5, 0, 0,   0.5, 0, 0,   0.5, 0, 0,  0.5, 0, 0　    // v4-v7-v6-v5 back
			]);
			break;
		case "GREY":
			var colors = new Float32Array([    // Colors
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v1-v2-v3 front
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v3-v4-v5 right
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v5-v6-v1 up
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v1-v6-v7-v2 left
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v7-v4-v3-v2 down
				0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5　    // v4-v7-v6-v5 back
			]);
			break;
		default:
			var colors = new Float32Array([    // Colors
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
				1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
			]);
	}
	if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
}

function initArrayBuffer (gl, attribute, data, num, type) {
	// Create a buffer object
	var buffer = gl.createBuffer();
	if (!buffer) {
		console.log('Failed to create the buffer object');
		return false;
	}
	// Write data into the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	// Assign the buffer object to the attribute variable
	var a_attribute = gl.getAttribLocation(gl.program, attribute);
	if (a_attribute < 0) {
		console.log('Failed to get the storage location of ' + attribute);
		return false;
	}
	gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
	// Enable the assignment of the buffer object to the attribute variable
	gl.enableVertexAttribArray(a_attribute);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return true;
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
	var m2 = new Matrix4(m);
	g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
	return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_isDirectionalLighting, u_isPointLighting) {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	modelMatrix.setTranslate(0, 0, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	
	// Figure out how to light the scene
	gl.uniform1i(u_isDirectionalLighting, false);
	gl.uniform1i(u_isPointLighting, false);
	g_lightFollowsCar = false;

	switch(g_lightingMode) {
		case 0:
			gl.uniform1i(u_isDirectionalLighting, true);
			break;
		case 1:
			gl.uniform1i(u_isPointLighting, true);
			setLightPos(gl,0,10,0);
			break;
		case 2:
			gl.uniform1i(u_isPointLighting, true);
			g_lightFollowsCar = true;
			break;
	}
	var n = initVertexBuffers(gl);
	if (n < 0) {console.log('Failed to set the vertex information');return;}
	
	//Draw plane
	pushMatrix(modelMatrix);
	writeColorBuffer(gl, "GREEN");
	modelMatrix.setTranslate(0,-1,0);
	modelMatrix.scale(g_planeSize, 0.05, g_planeSize); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();

	// Rotate, and then translate
	modelMatrix.setTranslate(g_carXPos, 0, g_carZPos);  // Translation (No translation is supported here)
	modelMatrix.rotate(g_yAngle, 0, 1, 0); // Rotate along y axis

	// Model the car body
	// Bottom bit
	pushMatrix(modelMatrix);
	writeColorBuffer(gl, "RED");
	modelMatrix.scale(3, 0.9, 1.5); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Top bit
	pushMatrix(modelMatrix);
	writeColorBuffer(gl, "DARKRED");
	modelMatrix.translate(0.5, 0.825, 0);  // Translation
	modelMatrix.scale(1.8, 0.75, 1.5); // Scale
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	
	writeColorBuffer(gl, "GREY")
	// Make wheels
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.6, 0.6, 0.2); // Scale
	// Push onto the stack to save the state to draw all wheels the same
	// Wheel 1
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.5, -0.8 ,-4);  // Translation
	modelMatrix.rotate(g_wheelAngle, 0, 0, 1); // Rotate wheels
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Wheel 2
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.5,-0.8,4);  // Translation
	modelMatrix.rotate(g_wheelAngle, 0, 0, 1); // Rotate wheels
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Wheel 3
	pushMatrix(modelMatrix);
	modelMatrix.translate(-1.5,-0.8,-4);  // Translation
	modelMatrix.rotate(g_wheelAngle, 0, 0, 1); // Rotate wheels
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Wheel 4
	pushMatrix(modelMatrix);
	modelMatrix.translate(1.5, -0.8, 4);  // Translation
	modelMatrix.rotate(g_wheelAngle, 0, 0, 1); // Rotate wheels
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	
	modelMatrix = popMatrix();
	writeColorBuffer(gl,"GREY")
	// Make doors
	pushMatrix(modelMatrix);
	// Save door shape
	// Door1
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.5, 0, 0.75);  // Translation
	if (g_doorOpen) {
		modelMatrix.translate(-0.175, 0, 0.25);
		modelMatrix.rotate(-30, 0, 1, 0);
	}
	modelMatrix.scale(1.5, 0.8, 0.1);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	// Door2
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.5, 0, -0.75);  // Translation
	if (g_doorOpen) {
		modelMatrix.translate(-0.175, 0, -0.25);
		modelMatrix.rotate(30, 0, 1, 0);
	}
	modelMatrix.scale(1.5, 0.8, 0.1);
	drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
	modelMatrix = popMatrix();
	
	if (g_lightFollowsCar) {
		setLightPos(gl,g_carXPos, 10, g_carZPos);
	}
	
	updateView(gl);
}


function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {
	pushMatrix(modelMatrix);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	g_normalMatrix.setInverseOf(modelMatrix);
	g_normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	modelMatrix = popMatrix();
}
