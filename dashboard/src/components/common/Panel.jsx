import './Panel.css'

export default function Panel({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag className={`panel ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}
