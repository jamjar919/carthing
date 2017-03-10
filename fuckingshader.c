attribute vec4 a_Position;
attribute vec4 a_Color;
attribute vec4 a_Normal;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform vec3 u_LightColor;
uniform vec3 u_LightDirection;
varying vec4 v_Color;
uniform vec3 u_LightPosition; 
uniform bool u_isDirectionalLighting;
uniform bool u_isPointLighting;
void main() {
  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  if(u_isDirectionalLighting)
  {
     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);
     float nDotL = max(dot(normal, u_LightDirection), 0.0);
     vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;
     v_Color = vec4(diffuse, a_Color.a);
  }
  else if (u_isPointLighting) { 
      vec4 vertexPosition = u_ModelMatrix * a_Position; 
      vec3 lightDirection = normalize(u_LightPosition – vec3(vertexPosition)); 
      float nDotL = max(dot( lightDirection, normal), 0.0); 
      vec3 diffuse = u_LightColor * a_Color.rgb * nDotL; 
      vec3 ambient = u_AmbientLight * a_Color.rgb; 
      v_Color = vec4(diffuse + ambient, a_Color.a); 
  } else 
  {
     v_Color = a_Color;
  }
}
