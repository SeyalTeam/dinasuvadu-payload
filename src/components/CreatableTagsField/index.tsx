'use client'
import React, { useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'
import CreatableSelect from 'react-select/creatable'

interface Option {
  label: string
  value: string
}

const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    backgroundColor: 'var(--theme-input-bg, #1a1a1a)',
    borderColor: 'var(--theme-border-color, rgba(255, 255, 255, 0.12))',
    color: 'var(--theme-text, #f0f0f0)',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--theme-border-color, rgba(255, 255, 255, 0.24))',
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: 'var(--theme-elevation-100, #242424)',
    border: '1px solid var(--theme-border-color, rgba(255, 255, 255, 0.12))',
    color: 'var(--theme-text, #f0f0f0)',
    zIndex: 9999,
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--theme-elevation-200, rgba(255, 255, 255, 0.12))' : 'transparent',
    color: 'var(--theme-text, #f0f0f0)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--theme-elevation-300, rgba(255, 255, 255, 0.18))',
    },
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: 'var(--theme-elevation-150, rgba(255, 255, 255, 0.08))',
    color: 'var(--theme-text, #f0f0f0)',
    borderRadius: '4px',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: 'var(--theme-text, #f0f0f0)',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: 'var(--theme-text-secondary, #a3a3a3)',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'var(--theme-elevation-300, rgba(255, 255, 255, 0.18))',
      color: 'var(--theme-error-500, #ef4444)',
    },
  }),
  input: (provided: any) => ({
    ...provided,
    color: 'var(--theme-text, #f0f0f0)',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: 'var(--theme-text, #f0f0f0)',
  }),
}

export const CreatableTagsField: React.FC<{ path: string }> = ({ path }) => {
  // We use any[] because relationship hasMany: true is represented as an array of IDs or populated objects in Payload
  const { value, setValue } = useField<any[] | null>({ path })
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')

  // Helper to extract clean string IDs from current values (handles both string IDs and populated objects)
  const getCurrentIds = (): string[] => {
    return (value || []).map((val: any) => {
      if (typeof val === 'string') return val
      if (val && typeof val === 'object' && 'id' in val) return val.id
      return String(val)
    })
  }

  // Fetch existing tags on load
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags?limit=300')
        if (res.ok) {
          const data = await res.json()
          if (data && data.docs) {
            const mapped = data.docs.map((doc: any) => ({
              label: doc.name,
              value: doc.id,
            }))
            setOptions(mapped)
          }
        }
      } catch (err) {
        console.error('Failed to fetch tags', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTags()
  }, [])

  // Map active values to Option objects for react-select
  const selectedOptions = options.filter((opt) => {
    return getCurrentIds().includes(opt.value)
  })

  // Control input changes
  const handleInputChange = (val: string, actionMeta: any) => {
    if (actionMeta.action === 'input-change') {
      setInputValue(val)
    }
  }

  // Helper to process a list of tag names (handles exists check locally, in DB, and creating if needed)
  const processTags = async (tagNames: string[]) => {
    const newTagIds: string[] = []
    const newOptions: Option[] = []

    for (const name of tagNames) {
      // 1. Check local options
      const existsLocally = options.find((opt) => opt.label.toLowerCase() === name.toLowerCase())
      if (existsLocally) {
        newTagIds.push(existsLocally.value)
        continue
      }

      try {
        // 2. Check database to prevent duplicates
        const searchRes = await fetch(`/api/tags?where[name][equals]=${encodeURIComponent(name)}&limit=1`)
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData && searchData.docs && searchData.docs.length > 0) {
            const existingTag = searchData.docs[0]
            newTagIds.push(existingTag.id)
            newOptions.push({ label: existingTag.name, value: existingTag.id })
            continue
          }
        }

        // 3. Create tag in database if it doesn't exist
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        })

        if (res.ok) {
          const doc = await res.json()
          const tagDoc = doc.doc || doc
          if (tagDoc && tagDoc.id && tagDoc.name) {
            newTagIds.push(tagDoc.id)
            newOptions.push({ label: tagDoc.name, value: tagDoc.id })
          }
        }
      } catch (err) {
        console.error(`Failed to process tag: ${name}`, err)
      }
    }

    if (newOptions.length > 0) {
      setOptions((prev) => {
        // Avoid adding duplicates to options state
        const filteredNew = newOptions.filter(newOpt => !prev.some(prevOpt => prevOpt.value === newOpt.value))
        return [...prev, ...filteredNew]
      })
    }

    const currentValues = getCurrentIds()
    const updatedValues = [...currentValues]
    for (const id of newTagIds) {
      if (!updatedValues.includes(id)) {
        updatedValues.push(id)
      }
    }
    setValue(updatedValues.length > 0 ? updatedValues : null)
    setInputValue('')
  }

  // Handle value changes (either selected from list or created)
  const handleChange = async (newValue: any, actionMeta: any) => {
    setInputValue('')
    if (actionMeta.action === 'create-option') {
      const newOption = newValue[newValue.length - 1]
      const name = newOption.label.trim()
      const tagNames = name
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      if (tagNames.length > 0) {
        await processTags(tagNames)
      }
    } else {
      const ids = newValue ? newValue.map((opt: any) => opt.value) : []
      setValue(ids.length > 0 ? ids : null)
    }
  }

  // Handle typing a comma to create the tag
  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === ',' || event.key === 'Enter') {
      const tagNames = inputValue
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      if (tagNames.length > 0) {
        event.preventDefault()
        await processTags(tagNames)
      }
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <label className="field-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        Tags
      </label>
      <CreatableSelect
        isMulti
        isLoading={loading}
        options={options}
        value={selectedOptions}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onBlur={() => setInputValue('')}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter or comma..."
        className="creatable-tags-select"
        classNamePrefix="react-select"
        styles={customSelectStyles}
      />
    </div>
  )
}
