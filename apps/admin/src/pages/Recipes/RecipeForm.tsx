import { useEffect, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminRecipesApi } from '../../api/recipes'
import type { Recipe, Ingredient, Step } from '../../types'
import styles from './RecipeForm.module.css'

type FormState = Omit<Recipe, 'id' | 'created_at' | 'source'> & {
  ingredients: Ingredient[]
  steps: Step[]
}

type Action =
  | { type: 'SET_FIELD'; field: keyof FormState; value: unknown }
  | { type: 'LOAD'; payload: Recipe }
  | { type: 'ADD_INGREDIENT' }
  | { type: 'UPDATE_INGREDIENT'; index: number; field: keyof Ingredient; value: string }
  | { type: 'REMOVE_INGREDIENT'; index: number }
  | { type: 'ADD_STEP' }
  | { type: 'UPDATE_STEP'; index: number; field: keyof Step; value: string | number }
  | { type: 'REMOVE_STEP'; index: number }

const initialState: FormState = {
  name: '', description: '', images: [], cuisine: '', category: '', meal_types: [],
  main_ingredient: '', protein_type: '', flavors: [], spicy_level: 0, cooking_method: '',
  prep_time: 15, cook_time: 30, difficulty: 'easy', nutrition_tags: [], season: [],
  created_by: undefined,
  ingredients: [{ name: '', amount: '', category: '主料', sort_order: 1 }],
  steps: [{ step_order: 1, description: '', images: [] }],
}

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'LOAD':
      return {
        ...state,
        ...action.payload,
        ingredients: action.payload.ingredients ?? [{ name: '', amount: '', category: '主料', sort_order: 1 }],
        steps: action.payload.steps ?? [{ step_order: 1, description: '', images: [] }],
      }
    case 'ADD_INGREDIENT':
      return { ...state, ingredients: [...state.ingredients, { name: '', amount: '', category: '配料', sort_order: state.ingredients.length + 1 }] }
    case 'UPDATE_INGREDIENT': {
      const ings = [...state.ingredients]
      ings[action.index] = { ...ings[action.index], [action.field]: action.value }
      return { ...state, ingredients: ings }
    }
    case 'REMOVE_INGREDIENT':
      return { ...state, ingredients: state.ingredients.filter((_, i) => i !== action.index) }
    case 'ADD_STEP':
      return { ...state, steps: [...state.steps, { step_order: state.steps.length + 1, description: '', images: [] }] }
    case 'UPDATE_STEP': {
      const stps = [...state.steps]
      stps[action.index] = { ...stps[action.index], [action.field]: action.value }
      return { ...state, steps: stps }
    }
    case 'REMOVE_STEP':
      return { ...state, steps: state.steps.filter((_, i) => i !== action.index).map((s, i) => ({ ...s, step_order: i + 1 })) }
    default:
      return state
  }
}

const CUISINES = ['川菜', '粤菜', '湘菜', '东北菜', '家常菜', '西式', '日式', '韩式', '其他']
const CATEGORIES = ['家常', '汤品', '凉菜', '炒菜', '炖菜', '蒸菜', '烤类', '主食', '点心']
const DIFFICULTIES = [{ value: 'easy', label: '简单' }, { value: 'medium', label: '中等' }, { value: 'hard', label: '复杂' }]
const COOKING_METHODS = ['炒', '炖', '蒸', '烤', '拌', '炸', '煮', '煎', '焖']
const PROTEIN_TYPES = ['猪肉', '牛肉', '鸡肉', '鱼肉', '海鲜', '蛋类', '豆类', '蔬菜']
const MEAL_TYPES = [{ value: 'breakfast', label: '早餐' }, { value: 'lunch', label: '午餐' }, { value: 'dinner', label: '晚餐' }]

export default function RecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [state, dispatch] = useReducer(reducer, initialState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit || !id) return
    adminRecipesApi.get(Number(id)).then(recipe => {
      dispatch({ type: 'LOAD', payload: recipe })
    }).catch(() => navigate('/recipes'))
  }, [id, isEdit, navigate])

  function setField(field: keyof FormState, value: unknown) {
    dispatch({ type: 'SET_FIELD', field, value })
  }

  function toggleArrayField(field: keyof FormState, value: string) {
    const arr = state[field] as string[]
    setField(field, arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value])
  }

  async function handleSave() {
    if (!state.name.trim()) { setError('请填写菜名'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...state }
      if (isEdit && id) {
        await adminRecipesApi.update(Number(id), payload)
      } else {
        await adminRecipesApi.create(payload)
      }
      navigate('/recipes')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.back} onClick={() => navigate('/recipes')}>← 返回</button>
          <h1 className={styles.title}>{isEdit ? '编辑菜谱' : '新建菜谱'}</h1>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {/* 左列：基本信息 */}
        <div className={styles.col}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>基本信息</h2>

            <div className={styles.field}>
              <label>菜名 *</label>
              <input value={state.name} onChange={e => setField('name', e.target.value)} placeholder="红烧肉" />
            </div>
            <div className={styles.field}>
              <label>简介</label>
              <textarea value={state.description} onChange={e => setField('description', e.target.value)} rows={3} placeholder="一道经典家常菜..." />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>菜系</label>
                <select value={state.cuisine} onChange={e => setField('cuisine', e.target.value)}>
                  <option value="">请选择</option>
                  {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>分类</label>
                <select value={state.category} onChange={e => setField('category', e.target.value)}>
                  <option value="">请选择</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>预处理时间 (分钟)</label>
                <input type="number" min={0} value={state.prep_time} onChange={e => setField('prep_time', Number(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label>烹饪时间 (分钟)</label>
                <input type="number" min={1} value={state.cook_time} onChange={e => setField('cook_time', Number(e.target.value))} />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>难度</label>
                <select value={state.difficulty} onChange={e => setField('difficulty', e.target.value)}>
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>辣度 (0-3)</label>
                <select value={state.spicy_level} onChange={e => setField('spicy_level', Number(e.target.value))}>
                  <option value={0}>不辣</option>
                  <option value={1}>微辣</option>
                  <option value={2}>中辣</option>
                  <option value={3}>重辣</option>
                </select>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>烹饪方式</label>
                <select value={state.cooking_method} onChange={e => setField('cooking_method', e.target.value)}>
                  <option value="">请选择</option>
                  {COOKING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>蛋白质类型</label>
                <select value={state.protein_type} onChange={e => setField('protein_type', e.target.value)}>
                  <option value="">请选择</option>
                  {PROTEIN_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label>适用餐次</label>
              <div className={styles.checkboxRow}>
                {MEAL_TYPES.map(mt => (
                  <label key={mt.value} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={state.meal_types.includes(mt.value)}
                      onChange={() => toggleArrayField('meal_types', mt.value)}
                    />
                    {mt.label}
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 右列：食材 + 步骤 */}
        <div className={styles.col}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>食材</h2>
              <button className={styles.addBtn} onClick={() => dispatch({ type: 'ADD_INGREDIENT' })}>+ 添加</button>
            </div>
            {state.ingredients.map((ing, i) => (
              <div key={i} className={styles.ingredientRow}>
                <input
                  className={styles.ingName}
                  placeholder="食材名"
                  value={ing.name}
                  onChange={e => dispatch({ type: 'UPDATE_INGREDIENT', index: i, field: 'name', value: e.target.value })}
                />
                <input
                  className={styles.ingAmount}
                  placeholder="用量"
                  value={ing.amount}
                  onChange={e => dispatch({ type: 'UPDATE_INGREDIENT', index: i, field: 'amount', value: e.target.value })}
                />
                <select
                  className={styles.ingCat}
                  value={ing.category}
                  onChange={e => dispatch({ type: 'UPDATE_INGREDIENT', index: i, field: 'category', value: e.target.value })}
                >
                  {['主料', '配料', '调味料', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className={styles.removeBtn} onClick={() => dispatch({ type: 'REMOVE_INGREDIENT', index: i })}>×</button>
              </div>
            ))}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>烹饪步骤</h2>
              <button className={styles.addBtn} onClick={() => dispatch({ type: 'ADD_STEP' })}>+ 添加</button>
            </div>
            {state.steps.map((step, i) => (
              <div key={i} className={styles.stepRow}>
                <div className={styles.stepNum}>{step.step_order}</div>
                <textarea
                  className={styles.stepDesc}
                  placeholder={`第 ${i + 1} 步描述...`}
                  rows={2}
                  value={step.description}
                  onChange={e => dispatch({ type: 'UPDATE_STEP', index: i, field: 'description', value: e.target.value })}
                />
                <input
                  className={styles.stepDuration}
                  type="number"
                  min={0}
                  placeholder="分钟"
                  value={step.duration ?? ''}
                  onChange={e => dispatch({ type: 'UPDATE_STEP', index: i, field: 'duration', value: Number(e.target.value) })}
                />
                <button className={styles.removeBtn} onClick={() => dispatch({ type: 'REMOVE_STEP', index: i })}>×</button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
