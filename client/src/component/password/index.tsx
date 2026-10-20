import { Modal } from "antd";
import { useState } from "react";
const Password = (props: { callback: (password: string, bool?: boolean) => void , open: boolean}) => {
    const {callback, open} = props;
    const [password, setPassword] = useState('');
    const submitPassword = () => {
        callback(password);
    }
  return (
    <div>
        <Modal
        title="Enter Password"
        visible={open}
        open={open}
        onCancel={() => callback('', false)}
        footer={[
            <button key="submit" onClick={submitPassword}>
                Submit
            </button>,
        ]}
      >
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Modal>
    </div>
  );
};

export default Password;