### To use

1. Install dot (graphviz). [Someone check if this works](https://brewinstall.org/Install-graphviz-on-Mac-with-Brew/)
2. `npm install`
3. Copy a [retool yaml file](https://github.com/narvar/narvar-retool/blob/master/Notifications/Preferences.yml) into `inputYaml.yaml`
4. `npm run generate`
5. Hopefully you've got an `output.png`
6. Be nice. This was a quick hack, and probably has a lot of bugs.

Here's an example:
![Example image](/example.png)

### What is Dot and why do I care? (AKA - how does this work?)

[Here's the grammar](https://www.graphviz.org/doc/info/lang.html)

[Here's a guide](https://www.graphviz.org/pdf/dotguide.pdf)

You can think of Dot as a graph-rendering system.

The Yaml file is a nice definition of the entire state of a Retool application. We can parse that file, and create our own relations between those elements. We can then construct a graph using those relations, and use that to render a general flow of the Retool app's connections.

Ex:
```
digraph d {
  encryptionAPI [label="encryptionAPI - RESTQuery"]
  textToDecrypt -> encryptionAPI [label="used in call" color="orange"]
  container1 [label="container1 - ContainerWidget" shape="rectangle"]
  text1 [label="text1 - TextWidget" shape="rectangle"]
  text4 [label="text4 - TextWidget" shape="rectangle"]
  textToDecrypt [label="textToDecrypt - TextInputWidget" shape="rectangle"]
  button1 [label="button1 - ButtonWidget" shape="rectangle"]
  button1 -> encryptionAPI [label="action" color="blue"]
  text5 [label="text5 - TextWidget" shape="rectangle"]
  encryptionAPI -> text5 [label="referenced in" color="purple"]
  container2 [label="container2 - ContainerWidget" shape="rectangle"]
}
```
