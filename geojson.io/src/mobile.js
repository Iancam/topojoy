import ui from './ui';
import map from './ui/map';
import data from './core/data';
import loader from './core/loader';
import router from './core/router';
import repo from './core/repo';
import user from './core/user';
import store from 'store';

const gjIO = geojsonIO(),
  gjUI = ui(gjIO).read;

d3.select('.geojsonio').call(gjUI);

gjIO.router.on();

function geojsonIO() {
  const context = {};
  context.dispatch = d3.dispatch('change', 'route');
  context.storage = store;
  context.map = map(context, true);
  context.data = data(context);
  context.dispatch.on('route', loader(context));
  context.repo = repo(context);
  context.router = router(context);
  context.user = user(context);
  return context;
}
