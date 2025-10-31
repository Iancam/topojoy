A place to keep development notes

# Geojson.io

## Trail Splitting

I need to better organize this code.

I could reuse the handlers code from rectangle.js in the splitTrails segments handlers section.

I should (according to mobx docs) also move business logic into the mobx store. √

when a trail splits, selectedtrailSegments gets updated, not selected trails

what happens if we don't update selectedtrailSegments? The user can select a vertex from a trail twice. We can highlight those vertices. When the time comes to split, we have to map old selected vertex ids to new vertices, so we can accurately split again. That means changing the vertex parentId and index.

So we

using indices as ids might not be the best idea

TODO: check splitting at multiple vertices √

TODO: reduce the density of vertices so that a user can unselect them easily

## app

TODO: When getting OSM geojson, it would be good to be able to get all features, cache them, and then filter from the cache when we want less than all features.

# database

should we have people sign up first or let them create a map first?

Maps are in local storage to start, and this works well. Only when the user saves an image should we prompt for them to create an account.

do we have a user story where they never create an account?
