/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

//no longer use shader 1 and 2 
/** @global A simple GLSL shader program */   
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

//reverse matrix
var rMatrix = mat3.create();

//stacks
var mvMatrixStack = [];
var lightPositionStack = [];
var eyePtStack = [];
var upStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,1.5,15.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [-10,-10,15];
//reset 
var lightNew = [1,1,1];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [195.0/255.0,195.0/255.0,195/255.0]; 
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

//Model parameter
var eulerY = 0;

//Cube Parameters
var vertexPositionBuffer;
var days=0;
// Create a place to store the textures
var cubeImage0;
var cubeImage1;
var cubeImage2;
var cubeImage3;
var cubeImage4;
var cubeImage5;
var cubeImages = [cubeImage0, cubeImage1, cubeImage2, cubeImage3, cubeImage4, cubeImage5]
var cubeMap;
// Variable to count the number of textures loaded
var texturesLoaded = 0;

//quat variable
var inc = 0;

/*

NOTE: the code below has pieces of HelloTexture, HelloMesh, and HelloEnivronmentMap. All of which was provided 
by the course.  

*/




//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile1(url) {
    console.log("Getting text file");
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
      console.log("Made promise");
    });
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Populate mesh buffers with data
   */
  function setUpPromise1(filename) {
    myMesh = new TriMesh();
    myPromise = asyncGetFile1(filename);
    myPromise.then((retrievedText) => {
      myMesh.loadFromOBJ(retrievedText);
      console.log("Yay! got the " + filename + " file");
    })
    .catch((reason) => {
      console.log('Handle rejected promise ('+reason+') here.');
    });
  }

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile2(url, face) {
  console.log("Getting image");
  return new Promise((resolve, reject) => {
    cubeImages[face] = new Image();
    cubeImages[face].onload = () => resolve({url, status: 'ok'});
    cubeImages[face].onerror = () => reject({url, status: 'error'});
    cubeImages[face].src = url
    console.log("Made promise");  
  });
}
//----------------------------------------------------------------------------------
/**
 * Setup a promise to load a texture
 */
function setupPromise2(filename, face) {
    myPromise = asyncGetFile2(filename, face);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    myPromise.then((status) => {
        handleTextureLoaded(cubeImages[face], face)
        console.log("Yay! got the " + filename + " file");
    })
    .catch(
        // Log the rejection reason
       (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i=0; i < names.length; i++) {
      try {
        context = canvas.getContext(names[i]);
      } catch(e) {}
      if (context) {
        break;
      }
    }
    if (context) {
      context.viewportWidth = canvas.width;
      context.viewportHeight = canvas.height;
    } else {
      alert("Failed to create WebGL context!");
    }
    return context;
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Translates degrees to radians
   * @param {Number} degrees Degree input to function
   * @return {Number} The radians that correspond to the degree input
   */
  function degToRad(degrees) {
    return degrees * Math.PI / 180;
  }
  
  //set up the following shader uploads to take in multiple shader programs instead of having a separate (but same) function for each shader
  //-------------------------------------------------------------------------
  /**
   * Sends Modelview matrix to shader
   */
  function uploadModelViewMatrixToShader(input) {
    gl.uniformMatrix4fv(input.mvMatrixUniform, false, mvMatrix);
  }
  
  //-------------------------------------------------------------------------
  /**
   * Sends projection matrix to shader
   */
  function uploadProjectionMatrixToShader(input) {
    gl.uniformMatrix4fv(input.pMatrixUniform, false, pMatrix);
  }
  
  //-------------------------------------------------------------------------
  /**
   * Generates and sends the normal matrix to the shader
   */
  function uploadNormalMatrixToShader(input) {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(input.nMatrixUniform, false, nMatrix);
  }
  
  //-------------------------------------------------------------------------
  /**
   * Generates and sends the reverse matrix to the shader
   */
  function uploadReverseMatrixToShader(input) {
    mat3.invert(rMatrix,nMatrix);
    gl.uniformMatrix3fv(input.rMatrixUniform, false, rMatrix);
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Pushes matrix onto modelview matrix stack
   */
  function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
  }

 //----------------------------------------------------------------------------------
  /**
   * Pops matrix off of modelview matrix stack
   */
  function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
  }

  //----------------------------------------------------------------------------------
  /**
   * Pushes lightposition onto lightposition stack to combat change on every tick
   */

  function pushLightPosition() {
    var copy = vec3.clone(lightPosition);
    lightPositionStack.push(copy);
  }

  //----------------------------------------------------------------------------------
  /**
   * Pops lightposition onto lightposition stack to combat change on every tick
   */

  function popLightPosition() {
    if (lightPositionStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    lightPosition = lightPositionStack.pop();
  }

  //----------------------------------------------------------------------------------
  /**
   * Pushes eyePt onto eyePtStack to combat change on every tick
   */

  function pushEyePosition() {
    var copy = vec3.clone(eyePt);
    eyePtStack.push(copy);
  }

  //----------------------------------------------------------------------------------
  /**
   * Pops eyePt onto eyePtStack to combat change on every tick
   */

  function popEyePosition() {
    if (eyePtStack.length == 0) {
      throw "Invalid popEyePosition!";
    }
    eyePt = eyePtStack.pop();
  }

  //----------------------------------------------------------------------------------
  /**
   * Pushes up onto upStack to combat change on every tick
   */
  
  function pushUp() {
    var copy = vec3.clone(up);
    upStack.push(copy);
  }
  //----------------------------------------------------------------------------------
  /**
   * Pops up onto upStack to combat change on every tick
   */
  
  function popUp() {
    if (upStack.length == 0) {
      throw "Invalid popUp!";
    }
    up = upStack.pop();
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Sends projection/modelview matrices to shader, passes in shaderprogram as input
   */
  function setMatrixUniforms(input) {
    uploadModelViewMatrixToShader(input);
    uploadNormalMatrixToShader(input);
    uploadProjectionMatrixToShader(input);
    uploadReverseMatrixToShader(input);
  }
  
  //-------------------------------------------------------------------------
  /**
   * Sends material information to the shader
   * @param {Float32} alpha shininess coefficient
   * @param {Float32Array} a Ambient material color
   * @param {Float32Array} d Diffuse material color
   * @param {Float32Array} s Specular material color
   * @param input shaderProgram
   */
  function setMaterialUniforms(alpha,a,d,s,input) {
    gl.uniform1f(input.uniformShininessLoc, alpha);
    gl.uniform3fv(input.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(input.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(input.uniformSpecularMaterialColorLoc, s);
  }
  
  //-------------------------------------------------------------------------
  /**
   * Sends light information to the shader
   * @param {Float32Array} loc Location of light source
   * @param {Float32Array} a Ambient light strength
   * @param {Float32Array} d Diffuse light strength
   * @param {Float32Array} s Specular light strength
   * @param input shaderProgram
   */
  function setLightUniforms(loc,a,d,s,input) {
    gl.uniform3fv(input.uniformLightPositionLoc, loc);
    gl.uniform3fv(input.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(input.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(input.uniformSpecularLightColorLoc, s);
  }

  //----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);
  
    // If we don't find an element with the specified id
    // we do an early exit
    if (!shaderScript) {
      return null;
    }
  
    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
      if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
        shaderSource += currentChild.textContent;
      }
      currentChild = currentChild.nextSibling;
    }
  
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      return null;
    }
  
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
  
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  
  
  //----------------------------------------------------------------------------------
  /**
   * Setup the fragment and vertex shaders for Mesh
   */
  function setUpShaders1() {
    vertexShader = loadShaderFromDOM("shader-vs-1");
    fragmentShader = loadShaderFromDOM("shader-fs-1");
  
    shaderProgram1 = gl.createProgram();
    gl.attachShader(shaderProgram1, vertexShader);
    gl.attachShader(shaderProgram1, fragmentShader);
    gl.linkProgram(shaderProgram1);
  
    if (!gl.getProgramParameter(shaderProgram1, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
    }
  
    gl.useProgram(shaderProgram1);
  
    shaderProgram1.vertexPositionAttribute = gl.getAttribLocation(shaderProgram1, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram1.vertexPositionAttribute);
  
    shaderProgram1.vertexNormalAttribute = gl.getAttribLocation(shaderProgram1, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram1.vertexNormalAttribute);
  
    shaderProgram1.mvMatrixUniform = gl.getUniformLocation(shaderProgram1, "uMVMatrix");
    shaderProgram1.pMatrixUniform = gl.getUniformLocation(shaderProgram1, "uPMatrix");
    shaderProgram1.nMatrixUniform = gl.getUniformLocation(shaderProgram1, "uNMatrix");
    shaderProgram1.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram1, "uLightPosition");
    shaderProgram1.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram1, "uAmbientLightColor");
    shaderProgram1.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram1, "uDiffuseLightColor");
    shaderProgram1.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram1, "uSpecularLightColor");
    shaderProgram1.uniformShininessLoc = gl.getUniformLocation(shaderProgram1, "uShininess");
    shaderProgram1.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram1, "uKAmbient");
    shaderProgram1.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram1, "uKDiffuse");
    shaderProgram1.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram1, "uKSpecular");
  
    console.log("shaders succesfully set up.");
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Setup the fragment and vertex shaders for Cube
   */
  function setUpShaders2() {
    vertexShader = loadShaderFromDOM("shader-vs-2");
    fragmentShader = loadShaderFromDOM("shader-fs-2");
    
    shaderProgram2 = gl.createProgram();
    gl.attachShader(shaderProgram2, vertexShader);
    gl.attachShader(shaderProgram2, fragmentShader);
    gl.linkProgram(shaderProgram2);
  
    if (!gl.getProgramParameter(shaderProgram2, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
    }
  
    gl.useProgram(shaderProgram2);
  
    shaderProgram2.vertexPositionAttribute = gl.getAttribLocation(shaderProgram2, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram2.vertexPositionAttribute);
  
    shaderProgram2.vertexNormalAttribute = gl.getAttribLocation(shaderProgram2, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram2.vertexNormalAttribute);
  
    shaderProgram2.mvMatrixUniform = gl.getUniformLocation(shaderProgram2, "uMVMatrix");
    shaderProgram2.pMatrixUniform = gl.getUniformLocation(shaderProgram2, "uPMatrix");
    shaderProgram2.nMatrixUniform = gl.getUniformLocation(shaderProgram2, "uNMatrix");
  
    console.log("shaders succesfully set up.");
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Setup the fragment and vertex shaders for Reflection
   */
  function setUpShaders3() {
    vertexShader = loadShaderFromDOM("shader-vs-3");
    fragmentShader = loadShaderFromDOM("shader-fs-3");
  
    shaderProgram3 = gl.createProgram();
    gl.attachShader(shaderProgram3, vertexShader);
    gl.attachShader(shaderProgram3, fragmentShader);
    gl.linkProgram(shaderProgram3);
  
    if (!gl.getProgramParameter(shaderProgram3, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
    }
  
    gl.useProgram(shaderProgram3);
  
    shaderProgram3.vertexPositionAttribute = gl.getAttribLocation(shaderProgram3, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram3.vertexPositionAttribute);
  
    shaderProgram3.vertexNormalAttribute = gl.getAttribLocation(shaderProgram3, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram3.vertexNormalAttribute);
  
    shaderProgram3.mvMatrixUniform = gl.getUniformLocation(shaderProgram3, "uMVMatrix");
    shaderProgram3.pMatrixUniform = gl.getUniformLocation(shaderProgram3, "uPMatrix");
    shaderProgram3.nMatrixUniform = gl.getUniformLocation(shaderProgram3, "uNMatrix");
    shaderProgram3.rMatrixUniform = gl.getUniformLocation(shaderProgram3, "uRMatrix");
    shaderProgram3.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram3, "uLightPosition");
    shaderProgram3.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram3, "uAmbientLightColor");
    shaderProgram3.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram3, "uDiffuseLightColor");
    shaderProgram3.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram3, "uSpecularLightColor");
    shaderProgram3.uniformShininessLoc = gl.getUniformLocation(shaderProgram3, "uShininess");
    shaderProgram3.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram3, "uKAmbient");
    shaderProgram3.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram3, "uKDiffuse");
    shaderProgram3.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram3, "uKSpecular");
  
    console.log("shaders succesfully set up.");
  }

//----------------------------------------------------------------------------------

function setupCubeBuffers() {
  // Create a buffer for the cube's vertices.
  
  cubeVertexBuffer = gl.createBuffer();
  
  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.
  
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  
  // Now create an array of vertices for the cube.
  var side  = 22.0; 
  
  var vertices = [
      // Front face
      -side, -side,  side,
      side, -side,  side,
      side,  side,  side,
      -side,  side,  side,
  
      // Back face
      -side, -side, -side,
      -side,  side, -side,
      side,  side, -side,
      side, -side, -side,
  
      // Top face
      -side,  side, -side,
      -side,  side,  side,
      side,  side,  side,
      side,  side, -side,
  
      // Bottom face
      -side, -side, -side,
      side, -side, -side,
      side, -side,  side,
      -side, -side,  side,
  
      // Right face
      side, -side, -side,
      side,  side, -side,
      side,  side,  side,
      side, -side,  side,
  
      // Left face
      -side, -side, -side,
      -side, -side,  side,
      -side,  side,  side,
      -side,  side, -side
  ];
  
  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
  // Map the texture onto the cube's faces.
  
  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  
  var textureCoordinates = [
      // Front
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0,
      // Back
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0,
      // Top
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0,
      // Bottom
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0,
      // Right
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0,
      // Left
      0.0 , 0.0 ,
      1.0, 0.0 ,
      1.0, 1.0,
      0.0 , 1.0
  ];
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                  gl.STATIC_DRAW);
  
  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.
  
  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  
  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  
  var cubeVertexIndices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23    // left
  ]
  
  // Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
  }

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
  setupCubeBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw a cube based on buffers.
 */
function drawCube(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram2.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram2.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.uniform1i(gl.getUniformLocation(shaderProgram2, "uSampler"), 0);

  // Draw the cube.

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms(shaderProgram2);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

//----------------------------------------------------------------------------------
/**
 * Creates textures for application to cube.
 */
function setupTextures() {

  cubeMap = gl.createTexture();
  setupPromise2("pos-z.png", 0);
  setupPromise2("neg-z.png", 1);
  setupPromise2("pos-y.png", 2);
  setupPromise2("neg-y.png", 3);
  setupPromise2("pos-x.png", 4);
  setupPromise2("neg-x.png", 5);
}

//----------------------------------------------------------------------------------
/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Number} face Which face of the cubeMap to add texture to
 */
function handleTextureLoaded(image, face) {
  console.log("handleTextureLoaded, image = " + image);
  texturesLoaded++;

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  if (face == 0) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }
  else if (face == 1) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }
  else if (face == 2) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }
  else if (face == 3) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }
  else if (face == 4) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }
  else if (face == 5) {
  	gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  // clamping
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // filtering
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}
//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45),
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);
  
    //Quat set up per tick 
    pushUp();
    pushEyePosition();
    var potQuat = quat.create();
    quat.fromEuler(potQuat, 0, -eulerY, 0.0);
    vec3.transformQuat(eyePt,eyePt,potQuat);
    vec3.transformQuat(up,up,potQuat);
    // We want to look down -z, so create a lookat point in that direction
    mat4.lookAt(vMatrix,eyePt,viewPt,up);
    popUp();
    popEyePosition();
  
    //Mesh set up per tick
    if (myMesh.loaded() && (texturesLoaded == 6)) {
      mvPushMatrix();
      pushLightPosition();
      vec3.rotateY(lightPosition, lightPosition, vec3.fromValues(0,0,0), degToRad(eulerY));
      vec3.rotateY(lightPosition, lightPosition, vec3.fromValues(0,0,0), degToRad(eulerY));
      mat4.multiply(mvMatrix,vMatrix,mvMatrix);
      gl.useProgram(shaderProgram2);
      setMatrixUniforms(shaderProgram2);
      setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular,shaderProgram2,);
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular,shaderProgram2);
      drawCube();
      var modelQuat = quat.create();
      var transformMatrix = mat4.create();
      quat.fromEuler(modelQuat, 0, -inc, 0.0);
      mat4.fromQuat(transformMatrix, modelQuat);
      mat4.multiply(mvMatrix, mvMatrix, transformMatrix);
      //if statement for reflection 
      if(document.getElementById("off").checked) {
        gl.useProgram(shaderProgram1);
        setMatrixUniforms(shaderProgram1);
        setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular,shaderProgram1);
        setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular,shaderProgram1);
        myMesh.drawTriangles();
      }
      if(document.getElementById("on").checked) {
        gl.useProgram(shaderProgram3);
        setMatrixUniforms(shaderProgram3);
        setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular,shaderProgram3);
        setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular,shaderProgram3);
        myMesh.drawTriangles();
      }
      mvPopMatrix();
      popLightPosition();
    }
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Startup function called from html code to start program.
   */
   function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setUpShaders1();
    setUpShaders2();
    setUpShaders3();
    setupBuffers();
    setupTextures();
    setUpPromise1("teapot.obj");
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    tick();
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Code to handle user interaction
   */
  var currentlyPressedKeys = {};
  
  function handleKeyDown(event) {
    currentlyPressedKeys[event.key] = true;
    if (currentlyPressedKeys["a"]) {
      // key A
      eulerY-= 1;
      //vec3.rotateY(lightPosition,lightPosition,vec3.fromValues(0,0,0),degToRad(eulerY));
    } else if (currentlyPressedKeys["d"]) {
      // key D
      eulerY+= 1;
      //vec3.rotateY(lightPosition,lightPosition,vec3.fromValues(0,0,0), degToRad(eulerY));
    }
    if (currentlyPressedKeys["ArrowUp"]){
      // Up cursor key
      event.preventDefault();
      eyePt[2]-= 0.1;
    } 
    else if (currentlyPressedKeys["ArrowDown"]){
      event.preventDefault();
      // Down cursor key
      eyePt[2]+= 0.1;
    }
    if (currentlyPressedKeys["ArrowLeft"]) {
      // Left cursor key
      event.preventDefault();
      inc -= 1;
    }
    else if (currentlyPressedKeys["ArrowRight"]) {
      // Right cursor key
      event.preventDefault();
      inc += 1;
    }

  }
  
  function handleKeyUp(event) {
    currentlyPressedKeys[event.key] = false;
  }
  
  //----------------------------------------------------------------------------------
  /**
    * Update any model transformations
    */
  function animate() {
    days=days+0.5;
    document.getElementById("eY").value=eulerY;
    document.getElementById("eZ").value=eyePt[2];
    document.getElementById("i").value=inc;
  
  }
  
  //----------------------------------------------------------------------------------
  /**
   * Keeping drawing frames....
   */
  function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
  }
  

