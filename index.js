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
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
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

import {
  h,
  app
} from 'hyperapp';

import {
  Box,
  BoxContainer,
  Input,
  Menubar
} from '@osjs/gui';

const basename = path => path.split('/').reverse()[0];
const pathname = path => {
  const split = path.split('/');
  split.splice(split.length - 1, 1);
  return split.join('/');
};

const view = (core, proc, win, bus) =>
  (state, actions) => h(Box, {}, [
      h(Menubar, {items: state.menu, onclick: (item, index, ev) => actions.menu({item, index, ev})}),
      h(BoxContainer, {grow: 1}, [
        h(Input, {type: 'textarea', value: state.text, class: 'osjs-gui-absolute-fill'})
      ]),
    ]);

const actions = (core, proc, win, bus) => {
  return {
    setText: text => state => ({text}),
    menu: ({item, index, ev}) => state => {
      core.make('osjs/contextmenu').show({
        menu: [
          {label: 'New', onclick: () => bus.emit('newFile')},
          {label: 'Open', onclick: () => bus.emit('openFile')},
          {label: 'Save', onclick: () => bus.emit('saveFile')},
          {label: 'Save As...', onclick: () => bus.emit('saveFileAs')},
          {label: 'Quit', onclick: () => proc.destroy()}
        ],
        position: ev.target
      });
    }
  };
};

OSjs.make('osjs/packages').register('Textpad', (core, args, options, metadata) => {
  const bus = core.make('osjs/event-handler', 'Textpad');

  const proc = core.make('osjs/application', {
    args,
    options,
    metadata
  });

  const state = {
    text: '',
    menu: [
      {label: 'File'}
    ],
  };

  proc.createWindow({
    id: 'TextpadWindow',
    title: metadata.title.en_EN,
    dimension: {width: 400, height: 400}
  })
    .on('destroy', () => proc.destroy())
    .on('render', (win) => win.focus())
    .render(($content, win) => {
      const a = app(state,
          actions(core, proc, win, bus),
          view(core, proc, win, bus),
          $content);

      const setTitle = title =>
        win.setTitle(`${proc.metadata.title.en_EN} - ${title}`);

      const save = async (item) => {
        if (item) {
          proc.args.path = item.path;
        }

        if (!proc.args.path) {
          return;
        }

        const contents = $content.querySelector('textarea').value;

        core.make('osjs/vfs')
          .writefile(proc.args.path, contents);
      };

      const createDialog = (type, callback) => {
        core.make('osjs/dialog', 'file', {
          type,
          filename: basename(proc.args.path),
          path: pathname(proc.args.path),
          mime: metadata.mimes
        }, (btn, item) => {
          if (btn === 'ok') {
            callback(item);
          }
        });
      };

      bus.on('readFile', (file) => {
        if (file) {
          core.make('osjs/vfs')
            .readfile(file.path)
            .then(contents => {
              a.setText(contents);
              setTitle(file.filename)
            });
        }
      });

      bus.on('newFile', () => {
        proc.args.path = '/New file.txt';
        setTitle('New file.txt');
        a.setText('');
      });

      bus.on('openFile', () => createDialog('open', (item) => bus.emit('readFile', item)));
      bus.on('saveFileAs', () => createDialog('save', (item) => bus.emit('saveFile', item)));
      bus.on('saveFile', (item) => save(item));

      if (args.file) {
        bus.emit('readFile', args.file);
      } else {
        bus.emit('newFile');
      }
    });

  return proc;
});
