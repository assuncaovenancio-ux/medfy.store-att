import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Document = {
  id: string
  user_id: string
  type: 'laudo' | 'receita' | 'relatorio'
  subtype: string
  patient_name: string
  patient_info: any
  content: string
  status: 'pending' | 'completed'
  created_at: string
}