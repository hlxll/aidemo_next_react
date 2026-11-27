/**
 * @deprecated 请改用 renderTable()，此方法将在 v2.0 移除
 */
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};
const useDebounce = (func, delay) => {
  const [debounced, setDebounced] = useState(func);
  useEffect(() => {
    if(debounced){
      clearTimeout(debounce)
    }
    debounce = setTimeout(() => setDebounced(func), delay);
    return () => clearTimeout(debounce);
  }, [func, delay]);
  return debounced;
};
export {
    debounce
}