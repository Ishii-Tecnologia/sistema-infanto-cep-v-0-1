migrate(
  (app) => {
    const children = app.findCollectionByNameOrId('children')

    if (!children.fields.getByName('clothing_size')) {
      children.fields.add(
        new TextField({
          name: 'clothing_size',
          required: false,
          max: 50,
        }),
      )
    }

    if (!children.fields.getByName('shoe_size')) {
      children.fields.add(
        new TextField({
          name: 'shoe_size',
          required: false,
          max: 50,
        }),
      )
    }

    app.save(children)
  },
  (app) => {
    try {
      const children = app.findCollectionByNameOrId('children')
      let changed = false

      if (children.fields.getByName('clothing_size')) {
        children.fields.removeByName('clothing_size')
        changed = true
      }

      if (children.fields.getByName('shoe_size')) {
        children.fields.removeByName('shoe_size')
        changed = true
      }

      if (changed) {
        app.save(children)
      }
    } catch (_) {}
  },
)
