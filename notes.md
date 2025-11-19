A place to keep development notes

# Form design tradeoffs

By creating one big form element function, it's very easy to add new form elements, and declare form components in terse data, rather than in jsx. Repetition of boilerplate per element is significantly reduced.
On the other hand, the form element function depends on all the props, regardless of whether a particular element uses them. This triggers a re-render for all form elements whenever state changes for any one element.

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

# features

initial render works differently than subsequent renders. It has the don't drop behavior, which means that things not in the keeplist will still be drawn if they don't collide. Subsequent renders have the drop behavior, which means features not in the keeplist will be dropped. The initial render sets the default keeplists.

What happens when a user reloads the page?

## adding collision aware features

we have keeplists, and we can store a list of potential collisions coming from the label manager.
for each feature, check if it is in the keeplist, if so, retrieve the list of features that it collides with. then see if each of those is in the keeplist. mark both red if so.

must allow the user to deselect all features

# an annoying bug

I made a function to convert flat keys to nested keys, but it didn't make a clone of the flat object, it just referenced it. I would create a nested object, set the keeplists of the nested object to be blank, and then in the console I was reading that the keeplists were actually full. I was modifying the flat object downstream, and this was causing the bug.
