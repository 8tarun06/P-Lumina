import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
  Image
} from '@react-pdf/renderer';
import { format } from "date-fns";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    backgroundColor: '#2196F3',
    height: 20,
    paddingLeft: 15,
    paddingTop: 5,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  invoiceTitle: {
    position: 'absolute',
    right: 15,
    top: 5,
    fontSize: 12,
    color: 'white'
  },
  section: {
    margin: 15,
    marginTop: 10,
    paddingBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#C8C8C8',
    marginHorizontal: 15,
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5
  },
  col: {
    flex: 1
  },
  colRight: {
    textAlign: 'right'
  },
  addressTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5
  },
  tableHeader: {
    backgroundColor: '#2196F3',
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 3,
    fontSize: 9
  },
  tableCell: {
    padding: 3,
    fontSize: 9,
    borderBottomWidth: 0.2,
    borderBottomColor: '#C8C8C8'
  },
  tableCellCenter: {
    textAlign: 'center'
  },
  tableCellRight: {
    textAlign: 'right'
  },
  amountInWords: {
    marginTop: 10,
    fontSize: 10
  },
  amountInWordsText: {
    fontWeight: 'bold'
  },
  totalsTable: {
    marginLeft: 135,
    width: 'auto'
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  totalsLabel: {
    width: 100,
    textAlign: 'right',
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4
  },
  totalsValue: {
    width: 80,
    textAlign: 'right',
    paddingTop: 4,
    paddingBottom: 4
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#2196F3'
  },
  dividerLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#2196F3',
    marginBottom: 5
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#646464'
  }
});

// Helper functions
const formatCurrency = (amount) => {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const convertToWords = (num) => {
  if (num === 0) return "Zero";
  
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  function convertLessThanOneThousand(n) {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanOneThousand(n % 100) : "");
  }
  
  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  
  if (crore > 0) result += convertLessThanOneThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + " Thousand ";
  if (num > 0) result += convertLessThanOneThousand(num);
  
  return result.trim();
};

// Invoice Component
const Invoice = ({ order, user }) => {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  const shippingCharges = order.shippingCharges || 0;
  const total = subtotal + tax + shippingCharges;
  const amountInWords = `Rupees ${convertToWords(Math.round(total))} only`;

  const billingAddress = [
    user.name || "N/A",
    order.billingAddress?.street || order.address || "N/A",
    `${order.billingAddress?.city || ""} ${order.billingAddress?.state || ""} ${order.billingAddress?.pincode ? `- ${order.billingAddress.pincode}` : ""}`.trim(),
    `Phone: ${user.phone || "N/A"}`,
    `Email: ${user.email || "N/A"}`
  ].filter(line => line && line !== " - ");

  const shippingAddressLines = [
    user.name || "N/A",
    order.shippingAddress?.street || order.address || "N/A",
    `${order.shippingAddress?.city || ""} ${order.shippingAddress?.state || ""} ${order.shippingAddress?.pincode ? `- ${order.shippingAddress.pincode}` : ""}`.trim(),
    `Phone: ${order.shippingAddress?.phone || user.phone || "N/A"}`
  ].filter(line => line && line !== " - ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text>YourBrand.in</Text>
          <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text>Invoice Number: INV-{order.id.padStart(6, "0") || "XXXXXX"}</Text>
              <Text>Order Number: {order.id || "N/A"}</Text>
              <Text>Invoice Date: {format(new Date(), "dd MMM, yyyy")}</Text>
              <Text>Order Date: {format(new Date(order.createdAt?.seconds * 1000 || Date.now()), "dd MMM, yyyy")}</Text>
            </View>
            <View style={[styles.col, styles.colRight]}>
              <Text>GSTIN: 22ABCDE1234F1Z5</Text>
              <Text>PAN: ABCDE1234F</Text>
              <Text>State: Maharashtra</Text>
              <Text>Code: 27</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.addressTitle}>BILL TO:</Text>
              {billingAddress.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
            <View style={styles.col}>
              <Text style={styles.addressTitle}>SHIP TO:</Text>
              {shippingAddressLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          {/* Table Header */}
          <View style={[styles.row, styles.tableHeader]}>
            <Text style={[styles.tableCell, { width: 20 }]}>#</Text>
            <Text style={[styles.tableCell, { width: 140 }]}>Description</Text>
            <Text style={[styles.tableCell, { width: 30 }]}>Qty</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>Unit Price (₹)</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>Amount (₹)</Text>
            <Text style={[styles.tableCell, { width: 40 }]}>Tax Rate</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>Tax Amount (₹)</Text>
          </View>

          {/* Table Rows */}
          {order.items.map((item, i) => (
            <View key={i} style={[styles.row, styles.tableCell]}>
              <Text style={[styles.tableCell, styles.tableCellCenter, { width: 20 }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: 140 }]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenter, { width: 30 }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 50 }]}>{formatCurrency(item.price)}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 50 }]}>{formatCurrency(item.price * item.quantity)}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenter, { width: 40 }]}>18%</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 50 }]}>{formatCurrency((item.price * item.quantity) * 0.18)}</Text>
            </View>
          ))}
        </View>

        {/* Amount in Words */}
        <View style={[styles.section, styles.amountInWords]}>
          <Text>Amount in Words:</Text>
          <Text style={styles.amountInWordsText}>{amountInWords}</Text>
        </View>

        {/* Totals Section */}
        <View style={[styles.section, styles.totalsTable]}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (18%):</Text>
            <Text style={styles.totalsValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Shipping Charges:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(shippingCharges)}</Text>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, { fontWeight: 'bold' }]}>Total Amount:</Text>
            <Text style={[styles.totalsValue, styles.totalAmount]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a computer-generated invoice and does not require a physical signature.</Text>
          <Text>YourBrand.in | Regd. Office: 123 Business Park, Mumbai - 400001 | support@yourbrand.in | +91 9876543210</Text>
        </View>
      </Page>
    </Document>
  );
};

// Export component and functions
export const GenerateInvoicePDF = ({ order, user }) => (
  <PDFDownloadLink 
  document={
    <Invoice 
      order={order} 
      user={{
        name: currentUser?.name || "Customer",
        phone: currentUser?.phone || "Not Provided",
        email: currentUser?.email || order.email || "Not Provided",
        address: order.address || currentUser?.defaultAddress || {}
      }} 
    />
  }
  fileName={`Invoice_${order.id}.pdf`}
  style={{ color: 'inherit', textDecoration: 'none' }}
>
  {({ loading }) => (
    <>
      <i className="fas fa-file-invoice"></i> 
      {loading ? 'Preparing...' : 'View Invoice'}
    </>
  )}
</PDFDownloadLink>

);

export const InvoicePreview = ({ order, user }) => (
  <PDFViewer width="100%" height="600px">
    <Invoice order={order} user={user} />
  </PDFViewer>
);

export default Invoice;
