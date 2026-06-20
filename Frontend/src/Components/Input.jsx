
function Input({label, type, className, ...rest}) {
  return (
    <div className='flex flex-col gap-2 w-full'>
        <label className='font-hanken-reg'>{label} :</label>
        <input 
            type={type}
            width={'100px'}
            className={` border-2 border-primary/20 rounded-md ${className}`}
            {...rest}
        />
    </div>
  )
}

export default Input