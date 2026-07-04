import React from "react";
import ShopSidebar from "../ShopSidebar/ShopSidebar";
import styles from "./SidebarFrame.module.css";

export default function SidebarFrame({ children, active }) {
  return (
    <div className={styles.frame}>
      <ShopSidebar active={active} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
