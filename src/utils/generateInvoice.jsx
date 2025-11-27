import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  PDFDownloadLink,
  PDFViewer
} from '@react-pdf/renderer';

// Create exact styles matching Myntra invoice
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.1,
    paddingTop: 10,
  },
  section: {
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textDecoration: 'underline'
  },
  bold: {
    fontWeight: 'bold'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3
  },
  col: {
    flex: 1
  },
  addressSection: {
    marginBottom: 8
  },
  addressTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3
  },
  // Table styles for main invoice
  mainTable: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#000'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000'
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 8
  },
  tableCell: {
    padding: 3,
    fontSize: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#000'
  },
  tableCellLast: {
    padding: 3,
    fontSize: 8
  },
  tableCellCenter: {
    textAlign: 'center'
  },
  tableCellRight: {
    textAlign: 'right'
  },
  // Specific column widths matching Myntra
  colQty: { width: '7%' },
  colGross: { width: '12%' },
  colDiscount: { width: '12%' },
  colCharges: { width: '12%' },
  colTaxable: { width: '13%' },
  colCGST: { width: '9%' },
  colSGST: { width: '11%' },
  colTotal: { width: '12%' },
  colEmpty: { width: '12%' },
  
  // Bill of Supply table styles
  supplyTable: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#000',
    marginTop: 5
  },
  supplyColParticulars: { width: '30%' },
  supplyColSAC: { width: '10%' },
  supplyColQty: { width: '10%' },
  supplyColGross: { width: '12%' },
  supplyColTaxable: { width: '13%' },
  supplyColSGST: { width: '8%' },
  supplyColCGST: { width: '8%' },
  supplyColTotal: { width: '9%' },
  
  // Goods transport table
  goodsTable: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#000',
    marginTop: 5
  },
  goodsColDesc: { width: '50%' },
  goodsColQty: { width: '15%' },
  goodsColWeight: { width: '20%' },
  goodsColValue: { width: '15%' },
  
  declaration: {
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 10
  },
  footer: {
    fontSize: 8,
    marginTop: 15
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8
  }
});

// Helper function for currency formatting
const formatCurrency = (amount) => {
  return `Rs ${amount.toFixed(2)}`;
};

// Main Invoice Component - Exact copy of Myntra structure
const Invoice = ({ order, user }) => {
  return (
    <Document>
      {/* ===== Page 1 ===== */}
      <Page size="A4" style={styles.page}>
        {/* Tax Invoice Title */}
        <View style={styles.section}>
          <Text style={styles.invoiceTitle}>Tax Invoice</Text>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text><Text style={styles.bold}>Invoice Number:</Text> {order.invoiceNumber || "127260B000102344"}</Text>
              <Text><Text style={styles.bold}>Order Number:</Text> {order.id || "1315316-0859306-7022801"}</Text>
              <Text><Text style={styles.bold}>Nature of Transaction:</Text> Intra-State</Text>
              <Text><Text style={styles.bold}>Place of Supply:</Text> MAHARASHTRA</Text>
            </View>
          </View>
        </View>

        {/* Bill to / Ship to */}
        <View style={[styles.section, styles.addressSection]}>
          <Text style={styles.addressTitle}>Bill to / Ship to:</Text>
          <Text>{user?.name || "Tarun Khilrani"}</Text>
          <Text>Sahakar Nagar 52A Sagar Villa near new cotton market road Near New Cotton market Amravati - 444603 MH, India</Text>
        </View>

        {/* Bill From */}
        <View style={[styles.section, styles.addressSection]}>
          <Text style={styles.addressTitle}>Bill From:</Text>
          <Text>YOURBRAND BUSINESS SOLUTIONS PRIVATE LIMITED - SJIT</Text>
          <Text>Ksquare Industrial Park, Warehouse 4, Before Padgha Toll naka, Nashik-Mumbai Highway, Near Pushkar Mela Hotel Rahul Narkhede, Padgha-Bhiwandi, Mumbai, Maharashtra-421101</Text>
          <Text style={styles.bold}>GSTIN Number: 27AACC08053G12D</Text>
        </View>

        {/* Customer Type */}
        <View style={styles.section}>
          <Text style={styles.bold}>Customer Type: Unregistered</Text>
        </View>

        {/* Ship From */}
        <View style={[styles.section, styles.addressSection]}>
          <Text style={styles.addressTitle}>Ship From:</Text>
          <Text>YOURBRAND BUSINESS SOLUTIONS PRIVATE LIMITED - SJIT</Text>
          <Text>Ksquare Industrial Park, Warehouse 4, Before Padgha Toll naka, Nashik-Mumbai Highway, Near Pushkar Mela Hotel Rahul Narkhede, Padgha-Bhiwandi, Mumbai, Maharashtra-421101</Text>
        </View>

        {/* Main Items Table */}
        <View style={styles.section}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colQty, styles.tableCellCenter]}>Qty</Text>
            <Text style={[styles.tableCell, styles.colGross, styles.tableCellCenter]}>Gross Amount</Text>
            <Text style={[styles.tableCell, styles.colDiscount, styles.tableCellCenter]}>Discount</Text>
            <Text style={[styles.tableCell, styles.colCharges, styles.tableCellCenter]}>Other Charges</Text>
            <Text style={[styles.tableCell, styles.colTaxable, styles.tableCellCenter]}>Taxable Amount</Text>
            <Text style={[styles.tableCell, styles.colCGST, styles.tableCellCenter]}>CGST</Text>
            <Text style={[styles.tableCell, styles.colSGST, styles.tableCellCenter]}>SGST/UGST</Text>
            <Text style={[styles.tableCell, styles.colTotal, styles.tableCellCenter]}>Total Amount</Text>
          </View>

          {/* Product Description Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colQty]}></Text>
            <Text style={[styles.tableCell, {width: '88%'}]}>
              <Text style={styles.bold}>BAANHRSY101006181(BA-HGS-200)</Text> - Bare Anatomy Rosemary Water Spray With Rice Water- 200 ml, Size:
            </Text>
          </View>
          
          {/* Size Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colQty]}></Text>
            <Text style={[styles.tableCell, {width: '88%'}]}>
              <Text style={styles.bold}>200 ML (200-300 ML)</Text>
            </Text>
          </View>

          {/* HSN Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colQty]}></Text>
            <Text style={[styles.tableCell, {width: '88%'}]}>
              <Text style={styles.bold}>HSN: 33059011, 2.5% CGST, 2.5% SGST/UGST,</Text>
            </Text>
          </View>

          {/* Item Data Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colQty, styles.tableCellCenter]}>1</Text>
            <Text style={[styles.tableCell, styles.colGross, styles.tableCellRight]}>{formatCurrency(399.00)}</Text>
            <Text style={[styles.tableCell, styles.colDiscount, styles.tableCellRight]}>{formatCurrency(79.00)}</Text>
            <Text style={[styles.tableCell, styles.colCharges, styles.tableCellRight]}>{formatCurrency(0.00)}</Text>
            <Text style={[styles.tableCell, styles.colTaxable, styles.tableCellRight]}>{formatCurrency(304.76)}</Text>
            <Text style={[styles.tableCell, styles.colCGST, styles.tableCellRight]}>{formatCurrency(7.62)}</Text>
            <Text style={[styles.tableCell, styles.colSGST, styles.tableCellRight]}>{formatCurrency(7.62)}</Text>
            <Text style={[styles.tableCellLast, styles.colTotal, styles.tableCellRight]}>{formatCurrency(320.00)}</Text>
          </View>

          {/* Total Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colQty, styles.tableCellCenter, styles.bold]}>TOTAL</Text>
            <Text style={[styles.tableCell, styles.colGross, styles.tableCellRight, styles.bold]}>{formatCurrency(399.00)}</Text>
            <Text style={[styles.tableCell, styles.colDiscount, styles.tableCellRight, styles.bold]}>{formatCurrency(79.00)}</Text>
            <Text style={[styles.tableCell, styles.colCharges, styles.tableCellRight, styles.bold]}>{formatCurrency(0.00)}</Text>
            <Text style={[styles.tableCell, styles.colTaxable, styles.tableCellRight, styles.bold]}>{formatCurrency(304.76)}</Text>
            <Text style={[styles.tableCell, styles.colCGST, styles.tableCellRight, styles.bold]}>{formatCurrency(7.62)}</Text>
            <Text style={[styles.tableCell, styles.colSGST, styles.tableCellRight, styles.bold]}>{formatCurrency(7.62)}</Text>
            <Text style={[styles.tableCellLast, styles.colTotal, styles.tableCellRight, styles.bold]}>{formatCurrency(320.00)}</Text>
          </View>
        </View>

        {/* Company Signature */}
        <View style={styles.section}>
          <Text style={[styles.bold, {marginTop: 15}]}>YOURBRAND BUSINESS SOLUTIONS PRIVATE LIMITED - SJIT</Text>
          <Text style={{marginTop: 20}}>Authorized Signatory</Text>
        </View>

        {/* Declaration */}
        <View style={[styles.section, styles.declaration]}>
          <Text style={styles.bold}>DECLARATION</Text>
          <Text>The goods sold as part of this shipment are intended for end-user consumption and are not for retail sale</Text>
        </View>

        {/* Registered Address */}
        <View style={styles.section}>
          <Text style={styles.bold}>Reg Address:</Text>
          <Text>YOURBRAND BUSINESS SOLUTIONS PRIVATE LIMITED - SJIT,PLOT No. 592, 1st Floor, UDYOG VIHAR, PHASE-V, Gurgaon, HARYANA-122016</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text>If you have any questions, feel free to call customer care at +91 80 6156 1999 or use Contact Us section in our App, or log on to www.yourbrand.in/contactus</Text>
        </View>

        {/* Footer Details */}
        <View style={[styles.section, styles.footer]}>
          <Text>PocketID: {user?.phone || "9806825979"}</Text>
          <Text>Invoice Date: 18 Nov 2025</Text>
          <Text>Order Date: 18 Nov 2025</Text>
          <Text>Nature of Supply: Goods</Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => (
          `Page ${pageNumber}`
        )} fixed />
      </Page>

      {/* ===== Page 2 ===== */}
      <Page size="A4" style={styles.page}>
        {/* Bill of Supply Title */}
        <View style={styles.section}>
          <Text style={styles.invoiceTitle}>Bill of Supply</Text>
        </View>

        {/* Bill of Supply Details */}
        <View style={styles.section}>
          <Text style={styles.addressTitle}>Bill of Supply Details</Text>
          <Text><Text style={styles.bold}>Bill of Supply Number :</Text> 12726FI012620747</Text>
          <Text><Text style={styles.bold}>Bill of Supply Date :</Text> 2025-11-21 11:55:00</Text>
          <Text><Text style={styles.bold}>Order Number :</Text> 131531608593067022801</Text>
          <Text><Text style={styles.bold}>Nature of transaction :</Text> Intra-state</Text>
          <Text><Text style={styles.bold}>Nature Of Supply :</Text> Service</Text>
        </View>

        {/* Billed From */}
        <View style={styles.section}>
          <Text style={styles.addressTitle}>Billed From</Text>
          <Text>YourBrand India Private Limited</Text>
          <Text>Warehouse Building Nos. WE-II, Renaissance Integrated Industrial Area, Village Vashere, Bhiwandi , Thane ,</Text>
          <Text>Maharashtra, MH, India - 421302</Text>
          <Text><Text style={styles.bold}>GSTIN :</Text> 27AABCF8078M1Z1</Text>
          <Text><Text style={styles.bold}>PAN :</Text> AABCF8078M</Text>
        </View>

        {/* Billed To */}
        <View style={styles.section}>
          <Text style={styles.addressTitle}>Billed To</Text>
          <Text>{user?.name || "Tarun Khilrani"}</Text>
          <Text>Sahakar Nagar 52A Sagar Villa near new cotton market road , India - 444603</Text>
          <Text><Text style={styles.bold}>State :</Text> Maharashtra</Text>
          <Text><Text style={styles.bold}>State Code :</Text> MH</Text>
          <Text><Text style={styles.bold}>Place of Supply :</Text> MAHARASHTRA</Text>
          <Text><Text style={styles.bold}>Customer Type:</Text> Unregistered</Text>
        </View>

        {/* Shipped From */}
        <View style={styles.section}>
          <Text style={styles.addressTitle}>Shipped From</Text>
          <Text>Ksquare Industrial Park, Warehouse 4, Before Padgha Toll naka, Nashik-Mumbai Highway, Near Pushkar Mela Hotel Rahul Narkhede, Padgha-Bhiwandi 421101, MAHARASHTRA, MH, India</Text>
        </View>

        {/* Shipped To */}
        <View style={styles.section}>
          <Text style={styles.addressTitle}>Shipped To</Text>
          <Text>{user?.name || "Tarun Khilrani"}</Text>
          <Text>Sahakar Nagar 52A Sagar Villa near new cotton market road , Maharashtra, MH, 444603</Text>
        </View>

        {/* Service Charges Table */}
        <View style={styles.section}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.supplyColParticulars]}>Particulars</Text>
            <Text style={[styles.tableCell, styles.supplyColSAC]}>SAC</Text>
            <Text style={[styles.tableCell, styles.supplyColQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.supplyColGross]}>Gross Amount</Text>
            <Text style={[styles.tableCell, styles.supplyColTaxable]}>Taxable Value</Text>
            <Text style={[styles.tableCell, styles.supplyColSGST]}>SGST</Text>
            <Text style={[styles.tableCell, styles.supplyColCGST]}>CGST</Text>
            <Text style={[styles.tableCellLast, styles.supplyColTotal]}>Total</Text>
          </View>

          {/* GT Charges Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.supplyColParticulars]}>GT charges</Text>
            <Text style={[styles.tableCell, styles.supplyColSAC]}>996511</Text>
            <Text style={[styles.tableCell, styles.supplyColQty, styles.tableCellCenter]}>1.0</Text>
            <Text style={[styles.tableCell, styles.supplyColGross, styles.tableCellRight]}>₹59.00</Text>
            <Text style={[styles.tableCell, styles.supplyColTaxable, styles.tableCellRight]}>₹59.00</Text>
            <Text style={[styles.tableCell, styles.supplyColSGST, styles.tableCellRight]}>₹0.00</Text>
            <Text style={[styles.tableCell, styles.supplyColCGST, styles.tableCellRight]}>₹0.00</Text>
            <Text style={[styles.tableCellLast, styles.supplyColTotal, styles.tableCellRight]}>₹59.00</Text>
          </View>

          {/* Tax Rate Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.supplyColParticulars]}>CGST</Text>
            <Text style={[styles.tableCell, styles.supplyColSAC]}>0.0 %</Text>
            <Text style={[styles.tableCell, styles.supplyColQty]}></Text>
            <Text style={[styles.tableCell, styles.supplyColGross]}></Text>
            <Text style={[styles.tableCell, styles.supplyColTaxable]}></Text>
            <Text style={[styles.tableCell, styles.supplyColSGST]}>SGST</Text>
            <Text style={[styles.tableCell, styles.supplyColCGST]}>0.0 %</Text>
            <Text style={[styles.tableCellLast, styles.supplyColTotal]}></Text>
          </View>

          {/* Total Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.supplyColParticulars]}>Total</Text>
            <Text style={[styles.tableCell, styles.supplyColSAC]}></Text>
            <Text style={[styles.tableCell, styles.supplyColQty, styles.tableCellCenter]}>1.0</Text>
            <Text style={[styles.tableCell, styles.supplyColGross, styles.tableCellRight]}>₹59.00</Text>
            <Text style={[styles.tableCell, styles.supplyColTaxable, styles.tableCellRight]}>₹59.00</Text>
            <Text style={[styles.tableCell, styles.supplyColSGST, styles.tableCellRight]}>₹0.00</Text>
            <Text style={[styles.tableCell, styles.supplyColCGST, styles.tableCellRight]}>₹0.00</Text>
            <Text style={[styles.tableCellLast, styles.supplyColTotal, styles.tableCellRight]}>₹59.00</Text>
          </View>
        </View>

        {/* Goods Transport Details */}
        <View style={styles.section}>
          <Text style={[styles.addressTitle, {marginTop: 10}]}>DETAILS OF GOODS TRANSPORTED BY GTA SUPPLIER</Text>
          
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.goodsColDesc]}>Description of Goods</Text>
            <Text style={[styles.tableCell, styles.goodsColQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.goodsColWeight]}>Gross Weight of Consignment</Text>
            <Text style={[styles.tableCellLast, styles.goodsColValue]}>Value of goods</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.goodsColDesc]}>Bare Anatomy</Text>
            <Text style={[styles.tableCell, styles.goodsColQty, styles.tableCellCenter]}>1.0</Text>
            <Text style={[styles.tableCell, styles.goodsColWeight, styles.tableCellCenter]}>1.0 KG</Text>
            <Text style={[styles.tableCellLast, styles.goodsColValue, styles.tableCellRight]}>320.0</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.goodsColDesc]}>Rosemary Water</Text>
            <Text style={[styles.tableCell, styles.goodsColQty]}></Text>
            <Text style={[styles.tableCell, styles.goodsColWeight]}></Text>
            <Text style={[styles.tableCellLast, styles.goodsColValue]}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.goodsColDesc]}>Spray With Rice</Text>
            <Text style={[styles.tableCell, styles.goodsColQty]}></Text>
            <Text style={[styles.tableCell, styles.goodsColWeight]}></Text>
            <Text style={[styles.tableCellLast, styles.goodsColValue]}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLast, styles.goodsColDesc]}>Water- 200 ml</Text>
            <Text style={[styles.tableCell, styles.goodsColQty]}></Text>
            <Text style={[styles.tableCell, styles.goodsColWeight]}></Text>
            <Text style={[styles.tableCellLast, styles.goodsColValue]}></Text>
          </View>
        </View>

        {/* Consignment Details */}
        <View style={styles.section}>
          <Text><Text style={styles.bold}>Consignor details:</Text> YourBrand India Private Limited (on behalf of {user?.name || "Tarun Khilrani"})</Text>
          <Text><Text style={styles.bold}>Place of Origin :</Text> Ksquare Industrial Park, Warehouse 4, Before Padgha Toll naka, Nashik-Mumbai Highway, Near Pushkar Mela Hotel Rahul Narkhede, Padgha-Bhiwandi 421101, MAHARASHTRA, MH, India-</Text>
          <Text><Text style={styles.bold}>Destination :</Text> {user?.name || "Tarun Khilrani"}</Text>
          <Text>Sahakar Nagar 52A Sagar Villa near new cotton market road , Maharashtra, MH, 444603</Text>
          <Text><Text style={styles.bold}>Consignee details:</Text> {user?.name || "Tarun Khilrani"}</Text>
          <Text><Text style={styles.bold}>Registration No. of Goods Carriage:</Text> MH04KJ8118</Text>
        </View>

        {/* Transportation Note */}
        <View style={styles.section}>
          <Text style={styles.declaration}>(More than 1 goods carriage may be involved in transportation of goods to the shipping address. The Registration Number mentioned above pertains to the vehicle used at the stage of commencement of transport)</Text>
        </View>

        {/* GST Declaration */}
        <View style={styles.section}>
          <Text>I/we have taken registration under the CGST Act, 2017 and have exercised the option to pay tax on services of GTA in relation to transport of goods supplied by us from the Financial Year 2025-26 under forward charge and have not reverted to reverse charge mechanism</Text>
        </View>

        {/* Page Number */}
        <View style={styles.section}>
          <Text>1 of 2</Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => (
          `Page ${pageNumber}`
        )} fixed />
      </Page>

      {/* ===== Page 3 ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text>Is the supply subject to reverse charge: No</Text>
          <Text>Person Liable to pay tax: GTA i.e. YourBrand India Private Limited</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bold}>E & O.E.;</Text>
        </View>

        <View style={styles.section}>
          <Text>2 of 2</Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => (
          `Page ${pageNumber}`
        )} fixed />
      </Page>
    </Document>
  );
};

// Export components
export const GenerateInvoicePDF = ({ order, currentUser }) => (
  <PDFDownloadLink 
    document={<Invoice order={order} user={currentUser} />}
    fileName={`Invoice_${order?.id || 'MYNTRA'}.pdf`}
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