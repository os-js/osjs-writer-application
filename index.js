/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) Anders Evenrud <andersevenrud@gmail.com>
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

// TODO: More options

import * as translations from './locales.js';

import osjs from 'osjs';
import {h, app} from 'hyperapp';
import {name as applicationName} from './metadata.json';
import rtfToHtml from '@iarna/rtf-to-html';
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
const getColor = (str, defaultValue) => {
  if (str) {
    const matches = str.replace(/\s+/g, '').match(/^rgba?\((.*)\)/) || [];
    if (matches.length) {
      const [r, g, b] = matches[1].split(',');

      return {r, g, b};
    }
  }

  return str || defaultValue;
};

const isRtf = item => item && item.mime === 'application/rtf';

const decode = str => new Promise((resolve, reject) => {
  rtfToHtml.fromString(str, {
    template: (doc, defaults, content) => content
  }, (err, doc) => {
    return err ? reject(err) : resolve(doc);
  });
});

/*
 * Base RichText template
 */
const template = (proc, win, s) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="text/javascript">
      function _UpdateUI_() {
        top.postMessage({
          name: 'osjs/iframe:message',
          params: [{
            pid: ${proc.pid},
            wid: ${win.wid},
            args: [{
              event: 'query'
            }]
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
      font-family: 'arial';
      color: ${defaultColor};
      background: #fff;
      padding: 20pt;
      box-sizing: border-box;
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
    margin: false,
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
const createToolbar = (__) => ([[{
  title: __('LBL_WRITER_STRONG'),
  icon: 'format-text-bold',
  command: 'bold'
}, {
  title: __('LBL_WRITER_ITALIC'),
  icon: 'format-text-italic',
  command: 'italic'
}, {
  title: __('LBL_WRITER_UNDERLINE'),
  icon: 'format-text-underline',
  command: 'underline'
}, {
  title: __('LBL_WRITER_THROUGHLINE'),
  icon: 'format-text-strikethrough',
  command: 'strikeThrough'
}], [{
  title: __('LBL_WRITER_LEFT_JUSTIFY'),
  icon: 'format-justify-left',
  command: 'justifyLeft'
}, {
  title: __('LBL_WRITER_CENTER_JUSTIFY'),
  icon: 'format-justify-center',
  command: 'justifyCenter'
}, {
  title: __('LBL_WRITER_RIGHT_JUSTIFY'),
  icon: 'format-justify-right',
  command: 'justifyRight'
}], [{
  title: __('LBL_WRITER_INDENT_LESS'),
  icon: 'format-indent-less',
  command: 'outdent'
}, {
  title: __('LBL_WRITER_INDENT_MORE'),
  icon: 'format-indent-more',
  command: 'indent'
}], [{
  title: __('LBL_WRITER_FOREGROUND'),
  command: 'foreColor',
  element: (state) => h(ColorBox, {color: state.props.foreColor}),
  callback: (state, actions, type) => actions.selectColor({type, color: state.props.foreColor})
}, {
  title: __('LBL_WRITER_BACKGROUND'),
  command: 'hiliteColor',
  element: () => h(ColorBox),
  callback: (state, actions, type) => actions.selectColor({type, color: state.props.hiliteColor})
}, {
  title: __('LBL_WRITER_FONT'),
  element: () => __('LBL_WRITER_FONT'),
  callback: (state, actions) => actions.selectFont()
}]]);

/*
 * Main Window Application
 */
const createApplication = (core, proc, basic, toolbar) => ($content, win) => {
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

  const createMutateSaveDialog = () => {
    const re = str => str.replace(/\.rtf$/i, '.doc');

    basic.createSaveDialog({
      file: Object.assign({}, proc.args.file, {
        filename: re(proc.args.file.filename),
        path: re(proc.args.file.path),
        mime: 'application/msword'
      })
    });
  };

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
      fontName: 'arial',
      fontSize: '1pt',
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
        .then(contents => isRtf(item) ? decode(contents) : contents)
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
    selectFont: () => state => proc.emit('tool:fontdialog', state.props),

    setProps: props => state => ({
      props: Object.assign(state.props, props)
    }),

    menuNew: () => state => basic.createNew(),
    menuOpen: () => state => basic.createOpenDialog(),
    menuSave: () => (state, actions) => {
      if (isRtf(proc.args.file)) {
        createMutateSaveDialog();
      } else {
        actions.save();
      }
    },
    menuSaveAs: () => state => {
      if (isRtf(proc.args.file)) {
        createMutateSaveDialog();
      } else {
        basic.createSaveDialog();
      }
    },
    menuQuit: () => state => proc.destroy()
  }, view, $content);
};

/*
 * Register OS.js Application
 */
osjs.register(applicationName, (core, args, options, metadata) => {
  let iframeDocument;

  const title = core.make('osjs/locale').translatableFlat(metadata.title);
  const __ = core.make('osjs/locale').translatable(translations);
  const toolbar = createToolbar(__);

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
    defaultFilename: 'New Document.doc',
    saveMimeTypes: ['application/msword']
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
    const ha = createApplication(core, proc, basic, toolbar)($content, win);

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
      iframeDocument.write(template(proc, win, str));
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
      color: getColor(color, command === 'hiliteColor' ? {r: 255, g: 255, b: 255} : undefined)
    }, (value) => {
      proc.emit('richtext:command', command, false, value.hex);
    }));

  proc.on('tool:fontdialog', props => {
    createDialog('font', {
      // TODO: Style
      minSize: 1,
      maxSize: 12,
      size: props.fontSize,
      name: props.fontName,
      unit: 'pt',
      fonts: [
        'arial',
        'sans-serif',
        'monospace'
      ]
    }, (value) => {
      proc.emit('richtext:command', 'fontName', false, value.name);
      proc.emit('richtext:command', 'fontSize', false, value.size);
    });
  });

  proc.on('destroy', () => basic.destroy());

  const valueMap = {
    '': null,
    'false': false,
    'true': true
  };

  const alternateMap = {
    hiliteColor: 'backcolor'
  };

  win.on('iframe:get', data => {
    if (data.event === 'query') {
      if (iframeDocument && iframeDocument.queryCommandValue) {
        const checks = [].concat(...toolbar).filter(iter => !!iter.command)
          .map(iter => iter.command)
          .concat([
            'fontFamily',
            'fontSize'
          ]);

        const states = checks.reduce((carry, name) => {
          let value = iframeDocument.queryCommandValue(name);
          if (!value && alternateMap[name]) {
            value = iframeDocument.queryCommandValue(alternateMap[name]);
          }

          return Object.assign({
            [name]: typeof valueMap[value] === 'undefined' ? value : valueMap[value]
          }, carry);
        }, {});

        proc.emit('ui:update', states);

        core.make('osjs/contextmenu').hide();
      }
    }
  });

  return proc;
});
