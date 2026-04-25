import { seedDrugCatalogue } from '../src/docs/seedDrugCatalogue'

async function run() {
  console.log('Starting drug catalogue seeder...')
  try {
    const { inserted, errors } = await seedDrugCatalogue()
    if (errors.length > 0) {
      console.warn('Finished with errors:')
      errors.forEach(e => console.warn(e))
    }
    process.exit(0)
  } catch (error) {
    console.error('Fatal error during seeding:', error)
    process.exit(1)
  }
}

run()
