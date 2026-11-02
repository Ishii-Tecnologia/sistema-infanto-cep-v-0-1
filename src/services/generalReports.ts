import pb from '@/lib/pocketbase/client'
import { Child, ClassroomId } from '@/types'

export interface StudentsByClassroomReportItem {
  id: string
  name: string
  birth_date: string
  classroom: ClassroomId
  photo_url?: string
  clothing_size?: string
  shoe_size?: string
  active?: boolean
  family_id?: string
  familyName?: string
}

export type SizeMissingFilter =
  | 'all'
  | 'missing_any'
  | 'missing_clothing'
  | 'missing_shoe'
  | 'missing_both'
  | 'complete'

export interface StudentSizesReportItem {
  id: string
  name: string
  birth_date: string
  classroom: ClassroomId
  photo_url?: string
  clothing_size?: string
  shoe_size?: string
  hasClothing: boolean
  hasShoe: boolean
  missingBoth: boolean
  missingAny: boolean
  familyName?: string
}

export const generalReportsService = {
  /**
   * Carrega a lista completa de crianças ativas no sistema com os dados necessários
   * para relatórios de aniversários e de tamanhos de roupas e calçados.
   */
  async loadActiveChildren(): Promise<Child[]> {
    return pb.collection('children').getFullList<Child>({
      filter: 'active = true',
      sort: 'classroom,name',
      expand: 'family_id',
    })
  },

  /**
   * Prepara os dados para o Relatório de Alunos por Sala (com aniversário)
   */
  processStudentsByClassroom(
    children: Child[],
    selectedClassroom: ClassroomId | 'ALL',
  ): StudentsByClassroomReportItem[] {
    return children
      .filter((c) => {
        if (selectedClassroom === 'ALL') return true
        return c.classroom === selectedClassroom
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        birth_date: c.birth_date,
        classroom: c.classroom,
        photo_url: c.photo_url,
        clothing_size: c.clothing_size,
        shoe_size: c.shoe_size,
        active: c.active,
        family_id: c.family_id,
        familyName: c.expand?.family_id?.reference_name,
      }))
      .sort((a, b) => {
        if (selectedClassroom === 'ALL' && a.classroom !== b.classroom) {
          return a.classroom.localeCompare(b.classroom)
        }
        return a.name.localeCompare(b.name, 'pt-BR')
      })
  },

  /**
   * Prepara e filtra os dados para o Relatório de Tamanhos de Roupa e Calçado
   */
  processStudentSizes(
    children: Child[],
    selectedClassroom: ClassroomId | 'ALL',
    missingFilter: SizeMissingFilter = 'all',
  ): StudentSizesReportItem[] {
    const list = children
      .filter((c) => {
        if (selectedClassroom === 'ALL') return true
        return c.classroom === selectedClassroom
      })
      .map((c) => {
        const clothing = (c.clothing_size || '').trim()
        const shoe = (c.shoe_size || '').trim()
        const hasClothing = clothing.length > 0
        const hasShoe = shoe.length > 0
        const missingBoth = !hasClothing && !hasShoe
        const missingAny = !hasClothing || !hasShoe

        return {
          id: c.id,
          name: c.name,
          birth_date: c.birth_date,
          classroom: c.classroom,
          photo_url: c.photo_url,
          clothing_size: clothing,
          shoe_size: shoe,
          hasClothing,
          hasShoe,
          missingBoth,
          missingAny,
          familyName: c.expand?.family_id?.reference_name,
        }
      })

    return list.filter((item) => {
      switch (missingFilter) {
        case 'missing_any':
          return item.missingAny
        case 'missing_clothing':
          return !item.hasClothing
        case 'missing_shoe':
          return !item.hasShoe
        case 'missing_both':
          return item.missingBoth
        case 'complete':
          return item.hasClothing && item.hasShoe
        case 'all':
        default:
          return true
      }
    })
  },
}
