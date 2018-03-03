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
  Input
} from '@osjs/gui';

const view = (core, proc, win) =>
  (state, actions) => h(Box, {orientation: 'vertical'}, [
      h(BoxContainer, {grow: 1}, [
        h(Input, {type: 'textarea', value: state.text, fill: true})
      ]),
    ]);

const actions = (core, proc, win) => {
  return {
    setContents: ({text, filename}) => state => {
      win.setTitle(`${proc.metadata.title.en_EN} - ${filename}`);

      return {text};
    }
  };
};

OSjs.make('osjs/packages').register('Textpad', (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {
    args,
    options,
    metadata
  });

  const state = {
    text: ''
  };

  proc.createWindow({
    id: 'TextpadWindow',
    title: metadata.title.en_EN,
    state: {
      dimension: {width: 400, height: 400}
    }
  })
    .on('destroy', () => proc.destroy())
    .on('render', (win) => win.focus())
    .render(($content, win) => {
      const a = app(state,
          actions(core, proc, win),
          view(core, proc, win),
          $content);

          if (args.file) {
            core.make('osjs/vfs')
              .readfile(args.file.path)
              .then(contents => a.setContents({
                filename: args.file.filename,
                text: contents
              }));
          }
    })

  return proc;
});
