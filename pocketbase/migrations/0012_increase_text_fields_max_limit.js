migrate(
  (app) => {
    // Aumentar o limite máximo (max) de campos de texto que podem ultrapassar
    // os 5000 caracteres padrão do PocketBase (fotos em base64, notas extensas, etc.)
    const TEXT_MAX_IMAGE_URL = 3000000 // 3MB em caracteres de texto
    const TEXT_MAX_LONG_TEXT = 50000 // 50k para observações e notas detalhadas

    // 1. guardians: photo_url
    try {
      const guardians = app.findCollectionByNameOrId('guardians')
      const photoField = guardians.fields.getByName('photo_url')
      if (photoField) {
        photoField.max = TEXT_MAX_IMAGE_URL
        app.save(guardians)
      }
    } catch (e) {
      console.warn('Erro ao atualizar limite de photo_url em guardians:', e)
    }

    // 2. children: photo_url, allergies, medical_notes
    try {
      const children = app.findCollectionByNameOrId('children')
      const photoField = children.fields.getByName('photo_url')
      if (photoField) {
        photoField.max = TEXT_MAX_IMAGE_URL
      }
      const allergiesField = children.fields.getByName('allergies')
      if (allergiesField) {
        allergiesField.max = TEXT_MAX_LONG_TEXT
      }
      const medField = children.fields.getByName('medical_notes')
      if (medField) {
        medField.max = TEXT_MAX_LONG_TEXT
      }
      app.save(children)
    } catch (e) {
      console.warn('Erro ao atualizar limites em children:', e)
    }

    // 3. books: cover_url, description
    try {
      const books = app.findCollectionByNameOrId('books')
      const coverField = books.fields.getByName('cover_url')
      if (coverField) {
        coverField.max = TEXT_MAX_IMAGE_URL
      }
      const descField = books.fields.getByName('description')
      if (descField) {
        descField.max = TEXT_MAX_LONG_TEXT
      }
      app.save(books)
    } catch (e) {
      console.warn('Erro ao atualizar limites em books:', e)
    }

    // 4. families: address, notes
    try {
      const families = app.findCollectionByNameOrId('families')
      const addressField = families.fields.getByName('address')
      if (addressField) {
        addressField.max = TEXT_MAX_LONG_TEXT
      }
      const notesField = families.fields.getByName('notes')
      if (notesField) {
        notesField.max = TEXT_MAX_LONG_TEXT
      }
      app.save(families)
    } catch (e) {
      console.warn('Erro ao atualizar limites em families:', e)
    }
  },
  (app) => {
    // Reversão opcional (restaura limite de 5000)
    try {
      const guardians = app.findCollectionByNameOrId('guardians')
      const photoField = guardians.fields.getByName('photo_url')
      if (photoField) {
        photoField.max = 5000
        app.save(guardians)
      }
    } catch (_) {}

    try {
      const children = app.findCollectionByNameOrId('children')
      const photoField = children.fields.getByName('photo_url')
      if (photoField) {
        photoField.max = 5000
      }
      app.save(children)
    } catch (_) {}

    try {
      const books = app.findCollectionByNameOrId('books')
      const coverField = books.fields.getByName('cover_url')
      if (coverField) {
        coverField.max = 5000
      }
      app.save(books)
    } catch (_) {}
  },
)
