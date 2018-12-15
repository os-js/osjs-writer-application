/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR ha PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

// TODO: Check selection and update toolbar UI
// TODO: Update dialogs based on selection
// TODO: More options

import osjs from 'osjs';
import {h, app} from 'hyperapp';
import {name as applicationName} from './metadata.json';
import {
  Box,
  Menubar,
  MenubarItem,
  Toolbar,
  Button,
  Iframe
} from '@osjs/gui';

const defaultColor = '#000000';

/*
 * Utils
 */
const getColor = str => {
  const matches = str.replace(/\s+/g, '').match(/^rgba?\((.*)\)/);
  if (matches.length) {
    const [r, g, b] = matches[1].split(',');

    return {r, g, b};
  }

  return str;
};

/*
 * Base RichText template
 */
const template = (proc, s) => `
<!DOCTYPE html>
<html>
  <head>
    <script type="text/javascript">
      function _UpdateUI_() {
        top.postMessage({
          pid: ${proc.pid},
          args: [{
            event: 'query'
          }]
        }, '*');
      }
    </script>
    <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      color: ${defaultColor};
      background: #fff;
    }
    </style>
  </head>
  <body contentEditable="true" onmouseup="_UpdateUI_()" ontouchend="_UpdateUI_()">${s}</body>
</html>`;

/*
 * Custom GUI Components
 */
const ToolbarContainer = (props, children) => h('div', {
  class: 'osjs-gui',
  style: {
    display: 'flex'
  }
}, children);

const ColorBox = (props) => h('div', {}, [
  h('div', {
    style: {
      width: '1em',
      height: '1em',
      background: props.color || '#fff'
    }
  })
]);

const RichText = (props) => h(Iframe, Object.assign({
  box: {
    grow: 1,
    shrink: 1,
  }
}, props));

/*
 * File Menu
 */
const createMenu = (current, actions, _) => ([
  {label: _('LBL_NEW'), onclick: () => actions.menuNew()},
  {label: _('LBL_OPEN'), onclick: () => actions.menuOpen()},
  {label: _('LBL_SAVE'), disabled: !current, onclick: () => actions.menuSave()},
  {label: _('LBL_SAVEAS'), onclick: () => actions.menuSaveAs()},
  {label: _('LBL_QUIT'), onclick: () => actions.menuQuit()}
]);

/*
 * Toolbar Elements
 */
const toolbar = [[{
  title: 'Strong',
  icon: 'format-text-bold',
  command: 'bold'
}, {
  title: 'Italic',
  icon: 'format-text-italic',
  command: 'italic'
}, {
  title: 'Underline',
  icon: 'format-text-underline',
  command: 'underline'
}, {
  title: 'Throughline',
  icon: 'format-text-strikethrough',
  command: 'strikeThrough'
}], [{
  title: 'Left justify',
  icon: 'format-justify-left',
  command: 'justifyLeft'
}, {
  title: 'Center justify',
  icon: 'format-justify-center',
  command: 'justifyCenter'
}, {
  title: 'Right justify',
  icon: 'format-justify-right',
  command: 'justifyRight'
}], [{
  title: 'Indent less',
  icon: 'format-indent-less',
  command: 'outdent'
}, {
  title: 'Indent more',
  icon: 'format-indent-more',
  command: 'indent'
}], [{
  title: 'Foreground',
  command: 'foreColor',
  element: (state) => h(ColorBox, {color: state.props.foreColor}),
  callback: (state, actions, type) => actions.selectColor({type, color: state.props.foreColor})
}, {
  title: 'Background',
  command: 'hiliteColor',
  element: () => h(ColorBox),
  callback: (state, actions, type) => actions.selectColor({type, color: state.props.hiliteColor})
}, {
  title: 'Font',
  element: () => 'Font',
  callback: (state, actions) => actions.selectFont()
}]];

/*
 * Main Window Application
 */
const createApplication = (core, proc, basic) => ($content, win) => {
  const _ = core.make('osjs/locale').translate;
  const {icon} = core.make('osjs/theme');
  const vfs = core.make('osjs/vfs');

  const toolbarButtons = (state, actions) => toolbar.map(t => {
    const buttons = t.map(b => h(Button, {
      title: b.title,
      icon: b.icon ? icon(b.icon) : undefined,
      active: state.props[b.command] === true,
      onclick: () => {
        if (b.callback) {
          b.callback(state, actions, b.command);
        } else if (b.command) {
          actions.textCommand(b.command);
        }
      }
    }, b.element ? b.element(state, actions, b.command) : []));

    return h(ToolbarContainer, {}, buttons);
  });

  const view = (state, actions) =>
    h(Box, {}, [
      h(Menubar, {}, [
        h(MenubarItem, {
          onclick: ev => actions.menu(ev)
        }, _('LBL_FILE'))
      ]),
      h(Toolbar, {}, toolbarButtons(state, actions)),
      h(Box, {
        grow: 1,
        shrink: 1,
        class: 'osjs-gui-box-styled'
      }, h(RichText, {
        oncreate: el => proc.emit('richtext:inited', el)
      }))
    ]);

  return app({
    props: {
      foreColor: defaultColor
    }
  }, {
    save: () => state => {
      if (proc.args.file) {
        proc.emit('richtext:get', contents => {
          vfs.writefile(proc.args.file, contents);
        });
      }
    },

    load: item => (state, actions) => {
      vfs.readfile(item)
        .then(contents => actions.setDocument(contents))
        .catch(error => console.error(error)); // FIXME: Dialog
    },

    menu: ev => (state, actions) => {
      core.make('osjs/contextmenu').show({
        position: ev.target,
        menu: createMenu(proc.args.file, actions, _)
      });
    },

    textCommand: command => () => proc.emit('richtext:command', command),

    setDocument: str => () => proc.emit('richtext:write', str),

    selectColor: ({type, color}) => () => proc.emit('tool:colordialog', type, color),
    selectFont: () => () => proc.emit('tool:fontdialog'),

    setProps: props => state => ({
      props: Object.assign(state.props, props)
    }),

    menuNew: () => state => basic.createNew(),
    menuOpen: () => state => basic.createOpenDialog(),
    menuSave: () => (state, actions) => actions.save(),
    menuSaveAs: () => state => basic.createSaveDialog(),
    menuQuit: () => state => proc.destroy()
  }, view, $content);
};

/*
 * Register OS.js Application
 */
osjs.register(applicationName, (core, args, options, metadata) => {
  let iframeDocument;

  const title = core.make('osjs/locale')
    .translatableFlat(metadata.title);

  const proc = core.make('osjs/application', {args, options, metadata});

  const win = proc.createWindow({
    title,
    id: 'WriterWindow',
    icon: proc.resource(proc.metadata.icon),
    dimension: {width: 600, height: 700}
  })
    .on('destroy', () => proc.destroy())
    .on('render', (win) => win.focus())
    .on('drop', (ev, data) => {
      if (data.isFile && data.mime) {
        const found = proc.metadata.mimes.find(m => (new RegExp(m)).test(data.mime));
        if (found) {
          basic.open(data);
        }
      }
    });

  const basic = core.make('osjs/basic-application', proc, win, {
    defaultFilename: 'New Document.txt'
  });

  const createDialog = (name, args, callback) =>
    core.make('osjs/dialog', name, args, {
      parent: win,
      attributes: {
        modal: true
      }
    }, (btn, value) => {
      if (btn === 'ok') {
        callback(value);
      }
    });

  win.render(($content, win) => {
    const ha = createApplication(core, proc, basic)($content, win);

    basic.on('new-file', () => ha.setDocument(''));
    basic.on('save-file', ha.save);
    basic.on('open-file', ha.load);

    proc.on('ui:update', props => ha.setProps(props));
  });

  proc.on('richtext:command', (command, ...args) => {
    if (iframeDocument && command) {
      iframeDocument.execCommand(command, ...args);
    }
  });

  proc.on('richtext:write', str => {
    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(template(proc, str));
      iframeDocument.close();
    }
  });

  proc.on('richtext:get', cb => {
    if (iframeDocument && cb) {
      cb(iframeDocument.body.innerHTML);
    }
  });

  proc.once('richtext:inited', (iframe) => {
    iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    proc.emit('richtext:write', '');

    basic.init();
  });

  proc.on('tool:colordialog', (command, color) =>
    createDialog('color', {
      color: getColor(color)
    }, (value) => {
      proc.emit('richtext:command', command, false, value.hex);
    }));

  proc.on('tool:fontdialog', () =>
    createDialog('font', {}, (value) => {
      proc.emit('richtext:command', 'fontName', false, value.name);
      proc.emit('richtext:command', 'fontSize', false, value.size);
    }));

  proc.on('destroy', () => basic.destroy());

  const valueMap = {
    '': null,
    'false': false,
    'true': true
  };

  proc.on('message', data => {
    if (data.event === 'query') {
      if (iframeDocument && iframeDocument.queryCommandValue) {
        const checks = [].concat(...toolbar).filter(iter => !!iter.command)
          .map(iter => iter.command);

        const states = checks.reduce((carry, name) => {
          const value = iframeDocument.queryCommandValue(name);

          return Object.assign({
            [name]: typeof valueMap[value] === 'undefined' ? value : valueMap[value]
          }, carry);
        }, {});

        console.debug(states);

        proc.emit('ui:update', states);
      }
    }
  });

  return proc;
});
