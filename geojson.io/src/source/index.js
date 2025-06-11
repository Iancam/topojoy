import { load, loadRaw } from './gist.js';
import { save as saveLocal } from './local.js';
import {
  load as loadGitHub,
  save as saveGitHub,
  loadRaw as loadRawGitHub
} from './github.js';

export default {
  gist: { load, loadRaw },
  local: { save: saveLocal },
  github: { load: loadGitHub, save: saveGitHub, loadRaw: loadRawGitHub }
};
