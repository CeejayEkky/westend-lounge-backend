// server/scripts/seedMenu.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const menuItems = [
  // Grills
  { name: 'Grilled Catfish (Whole)', price: 8000, description: 'Fresh catfish grilled with secret spices, served with plantain', category: 'grills', image_url: '/pic1.jpg', available: true, popular: true, spicy: true },
  { name: 'Pepper Soup Catfish', price: 6000, description: 'Spicy catfish pepper soup with yam', category: 'grills', image_url: '/pic2.jpg', available: true, popular: true, spicy: true },
  { name: 'Suya Platter', price: 5500, description: 'Assorted suya with onions and tomatoes', category: 'grills', image_url: '/pic3.jpg', available: true, popular: false, spicy: true },
  { name: 'Grilled Chicken (Full)', price: 7000, description: 'Full chicken grilled to perfection', category: 'grills', image_url: '/pic4.jpg', available: true, popular: false, spicy: false },
  
  // Appetizers
  { name: 'Buffalo Wings (6pcs)', price: 3500, description: 'Spicy buffalo wings with ranch dip', category: 'appetizers', image_url: '/pic5.jpg', available: true, popular: true, spicy: true },
  { name: 'Chicken Gizzard', price: 3000, description: 'Stir-fried gizzard with peppers', category: 'appetizers', image_url: '/pic6.webp', available: true, popular: false, spicy: true },
  { name: 'Peppered Snail', price: 4000, description: 'Fresh snails in spicy pepper sauce', category: 'appetizers', image_url: '/pic7.jpg', available: true, popular: false, spicy: true },
  
  // Main Course
  { name: 'Jollof Rice + Chicken', price: 4500, description: 'Party jollof with grilled chicken', category: 'main', image_url: '/pic8.jpg', available: true, popular: true, spicy: false },
  { name: 'Fried Rice + Catfish', price: 5000, description: 'Special fried rice with grilled catfish', category: 'main', image_url: '/pic9.avif', available: true, popular: false, spicy: false },
  { name: 'Pounded Yam + Egusi', price: 4000, description: 'Smooth pounded yam with egusi soup', category: 'main', image_url: '/pic99.webp', available: true, popular: false, spicy: true },
  
  // Drinks
  { name: 'Coke/Sprite/Fanta', price: 500, description: 'Chilled soft drinks', category: 'drinks', image_url: '/pic11.webp', available: true, popular: false, spicy: false },
  { name: 'Maltina/Amstel Malt', price: 800, description: 'Non-alcoholic malt', category: 'drinks', image_url: '/pic12.jpg', available: true, popular: false, spicy: false },
  { name: 'Zobo Drink', price: 700, description: 'Hibiscus tea with ginger', category: 'drinks', image_url: '/pic13.jpg', available: true, popular: false, spicy: false },
  { name: 'Chapman', price: 2500, description: 'Non-alcoholic cocktail', category: 'drinks', image_url: '/pic14.jpg', available: true, popular: false, spicy: false },
  
  // Cocktails
  { name: 'Sex on the Beach', price: 4000, description: 'Vodka, peach schnapps, cranberry', category: 'cocktails', image_url: '/pic15.jpg', available: true, popular: true, spicy: false },
  { name: 'Mojito', price: 3500, description: 'Rum, mint, lime, soda', category: 'cocktails', image_url: '/pic16.jpg', available: true, popular: false, spicy: false },
  { name: 'Pina Colada', price: 4000, description: 'Rum, coconut cream, pineapple', category: 'cocktails', image_url: '/pic17.jpg', available: true, popular: false, spicy: false },
  { name: 'Long Island Iced Tea', price: 5000, description: '5 types of rum + tequila + vodka', category: 'cocktails', image_url: '/pic18.webp', available: true, popular: false, spicy: false },
  { name: 'Tequila Sunrise', price: 3800, description: 'Tequila, orange, grenadine', category: 'cocktails', image_url: '/pic19.webp', available: true, popular: false, spicy: false },
  
  // Desserts
  { name: 'Chocolate Lava Cake', price: 2500, description: 'Warm chocolate cake with ice cream', category: 'desserts', image_url: '/pic20.jpg', available: true, popular: false, spicy: false },
  { name: 'Ice Cream (2 scoops)', price: 1500, description: 'Vanilla, chocolate, strawberry', category: 'desserts', image_url: '/pic21.jpg', available: true, popular: false, spicy: false },
]

async function seedMenu() {
  console.log('🌱 Starting menu seeding...\n')
  
  let inserted = 0
  let skipped = 0
  let errors = 0
  
  for (const item of menuItems) {
    // Check if item already exists
    const { data: existing } = await supabase
      .from('menu_items')
      .select('name')
      .eq('name', item.name)
      .single()
    
    if (existing) {
      console.log(`⏭️  Skipping ${item.name} - already exists`)
      skipped++
      continue
    }
    
    const { error } = await supabase
      .from('menu_items')
      .insert(item)
    
    if (error) {
      console.error(`❌ Error inserting ${item.name}:`, error.message)
      errors++
    } else {
      console.log(`✅ Inserted ${item.name} (${item.category})`)
      inserted++
    }
  }
  
  console.log('\n📊 Seeding Summary:')
  console.log(`   ✅ Inserted: ${inserted}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log('\n🎉 Menu seeding complete!')
}

// Run the seed
seedMenu()