const fs = require('fs');
const YAML = require('yamljs');
// console.log('INPUT APP STATE');
// console.log(require('./input2.json').page.data.appState);
const sourcesMap = {};
const widgetMap = {};
const funcMap = {};

const permittedPluginFields = ['data', 'action', 'triggersOnSuccess', 'triggersOnFailure','value', 'values', 'labels', 'onSelect'];
const permittedSourceFields = ['triggersOnSuccess', 'triggersOnFailure', 'query', 'body', 'changeset'];

const parsePlugin = plugin => {
  const id = Object.keys(plugin)[0];
  const pluginObj = plugin[id].pluginTemplate;
  // console.log('PLUGIN');
  // console.log(pluginObj);
  if (pluginObj.type === 'datasource') {
    sourcesMap[id] = {
      type: pluginObj.type,
      subtype: pluginObj.subtype,
      resourceName: pluginObj.resourceName,
    }
    const currentSource = sourcesMap[id];
    pluginObj.template.ordered.forEach(dataPoint => {
      const keyName = Object.keys(dataPoint)[0];
      const keyVal = Object.values(dataPoint)[0];
      if (permittedSourceFields.includes(keyName)) {
        currentSource[keyName] = keyVal;
      }
    })
  } else if (pluginObj.type === 'widget') {
    widgetMap[id] = {
      type: pluginObj.type,
      subtype: pluginObj.subtype,
    }
    const currentWidget = widgetMap[id];
    pluginObj.template.ordered.forEach(dataPoint => {
      const keyName = Object.keys(dataPoint)[0];
      const keyVal = Object.values(dataPoint)[0];
      if (permittedPluginFields.includes(keyName)) {
        currentWidget[keyName] = keyVal;
      }
    })
  } else if (pluginObj.type === 'function') {
    funcMap[id] = {
      type: pluginObj.type,
      subtype: pluginObj.subtype,
      funcBody: pluginObj.template.ordered[0].funcBody,
    }

    const currentFunc = funcMap[id];
    pluginObj.template.ordered.forEach(dataPoint => {
      const keyName = Object.keys(dataPoint)[0];
      const keyVal = Object.values(dataPoint)[0];
      if (permittedSourceFields.includes(keyName)) {
        currentFunc[keyName] = keyVal;
      }
    })
  }
}

fs.readFile('./inputYaml.yaml', 'utf8', function(err, contents) {
  const yamlObj = YAML.parse(contents);
  yamlObj.appTemplate.plugins.ordered.forEach(parsePlugin);
  const stream = fs.createWriteStream("dotGraph.dot");
  stream.write("digraph d {\n");
  const widgetSourceMapArr = [...Object.keys(sourcesMap), ...Object.keys(widgetMap), ...Object.keys(funcMap)];
  Object.keys(sourcesMap).forEach(key => {
    const sourceObj = sourcesMap[key];
    stream.write(`${key} [label="${key} - ${sourceObj.subtype}"]\n`);
    if (sourceObj.triggersOnSuccess && sourceObj.triggersOnSuccess.length > 0) {
      sourceObj.triggersOnSuccess.forEach(onSuccess => {
        stream.write(`${key} -> ${onSuccess} [label="onSuccess" color="green"]\n`);
      })
    }
    if (sourceObj.subtype === 'JavascriptQuery' && sourceObj.query) {
      widgetSourceMapArr.forEach(thing => {
        if (sourceObj.query.includes(`${thing}`)) {
          stream.write(`${thing} -> ${key} [label="referenced in call" color="purple"]\n`);
        }
      })
    } else if (sourceObj.subtype === 'RetoolTableQuery' && sourceObj.changeset) {
      const replacedQuery = sourceObj.changeset && sourceObj.changeset.replace(/[\s\{\}(]*/g, '');
      const replacedBody = sourceObj.body && sourceObj.body.replace(/[\s\{\}(]*/g, '');
      widgetSourceMapArr.forEach(thing => {
        if ((replacedQuery && replacedQuery.includes(`${thing}`))
          || (replacedBody && replacedBody.includes(`${thing}`))) {
          stream.write(`${thing} -> ${key} [label="used in query" color="cyan"]\n`);
        }
      })
    } else if ((sourceObj.query || sourceObj.body) && (sourceObj.id !== 'switchback' && key !== 'switchback')) {
      const replacedQuery = sourceObj.query && sourceObj.query.replace(/[\s\{\}(]*/g, '');
      const replacedBody = sourceObj.body && sourceObj.body.replace(/[\s\{\}(]*/g, '');
      widgetSourceMapArr.forEach(thing => {
        if ((replacedQuery && replacedQuery.includes(`${thing}`))
          || (replacedBody && replacedBody.includes(`${thing}`))) {
          stream.write(`${thing} -> ${key} [label="used in call" color="orange"]\n`);
        }
      })
    }
  })
  Object.keys(widgetMap).forEach(key => {
    const widgetObj = widgetMap[key];
    stream.write(`${key} [label="${key} - ${widgetObj.subtype}" shape="rectangle"]\n`);
    if (widgetObj.action) {
      stream.write(`${key} -> ${widgetObj.action} [label="action" color="blue"]\n`);
    }
    if (widgetObj.data) {
      const inputName = widgetObj.data.replace(/[{}\s]*/g, '').split('.')[0];
      stream.write(`${inputName} -> ${key}\n`);
    }
    if (widgetObj.value || widgetObj.values || widgetObj.labels) {
      const replacedValue = widgetObj.value && widgetObj.value.replace(/[\s\{\}(]*/g, '');
      const replacedValues = widgetObj.values && widgetObj.values.replace(/[\s\{\}(]*/g, '');
      const replacedLabels = widgetObj.labels && widgetObj.labels.replace(/[\s\{\}(]*/g, '');
      widgetSourceMapArr.forEach(thing => {
        if ((replacedValues && replacedValues.includes(`${thing}`))
          || (replacedLabels && replacedLabels.includes(`${thing}`))
          || (replacedValue && replacedValue.includes(thing))) {
          stream.write(`${thing} -> ${key} [label="referenced in" color="purple"]\n`);
        }
      })
    }
    if (widgetObj.onSelect) {
      widgetSourceMapArr.forEach(thing => {
        if (widgetObj.onSelect.includes(`${thing}`)) {
          stream.write(`${key} -> ${thing} [label="on select" color="blue"]\n`);
        }
      })
    }
  })
  Object.keys(funcMap).forEach(key => {
    const funcObj = funcMap[key];
    stream.write(`${key} [label="${key} - ${funcObj.type}" shape="hexagon"]\n`);
    widgetSourceMapArr.forEach(thing => {
      const replacedBody = funcObj.funcBody && funcObj.funcBody.replace(/[\s\{\}(]*/g, '');
      const toReplace = `thing}`;
      const regex = new RegExp(toReplace, 'g');
      if (replacedBody.includes(thing)) {
        stream.write(`${thing} -> ${key} [label="referenced in call" color="purple"]\n`);
      }
    })
  })
  stream.write(`}`);
});
