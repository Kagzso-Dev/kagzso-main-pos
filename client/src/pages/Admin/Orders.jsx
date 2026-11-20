import OrderHistoryView from '../../components/OrderHistoryView';

/**
 * AdminOrders page: wraps shared OrderHistoryView with full admin privileges.
 */
const AdminOrders = () => {
    return <OrderHistoryView readOnly={false} allowCancel={true} />;
};

export default AdminOrders;
